const supabase = require('./supabase')

function normalizeName(value) {
  return String(value || '').trim().toLowerCase()
}

async function loadInventoryItems() {
  const { data, error } = await supabase.from('inventory_items').select('*')
  if (error) throw error
  return Array.isArray(data) ? data : []
}

function getInventoryMatches(items, inventoryItems) {
  const byId = new Map(inventoryItems.map((item) => [String(item.id), item]))
  const byName = new Map(inventoryItems.map((item) => [normalizeName(item.item_name), item]))
  const matches = []
  const shortages = []
  // Rows that named an item we could not resolve. Previously these were
  // skipped in silence, so a renamed or mistyped item deducted nothing and
  // nobody found out.
  const unmatched = []

  for (const item of Array.isArray(items) ? items : []) {
    // Prefer the id the UI captured; fall back to name for older payloads
    // (saved drafts) that predate inventory_item_id being sent.
    const inventoryItem =
      (item?.inventory_item_id ? byId.get(String(item.inventory_item_id)) : null) ||
      byName.get(normalizeName(item?.item_name)) ||
      null

    const required = Number(item?.quantity || 0)

    if (!inventoryItem) {
      if (item?.item_name) unmatched.push({ item_name: item.item_name, required })
      continue
    }

    if (!required) continue

    const available = Number(inventoryItem.current_stock || 0)
    const shortage = available - required

    matches.push({
      inventory_item_id: inventoryItem.id,
      item_name: inventoryItem.item_name,
      unit: inventoryItem.unit,
      available,
      required,
      shortage,
    })

    if (shortage < 0) {
      shortages.push({
        item_name: inventoryItem.item_name,
        unit: inventoryItem.unit,
        available,
        required,
      })
    }
  }

  return { matches, shortages, unmatched }
}

async function previewInventoryUsage(items) {
  const inventoryItems = await loadInventoryItems()
  return getInventoryMatches(items, inventoryItems)
}

const MAX_STOCK_WRITE_ATTEMPTS = 5

// Decrement one item's stock safely under concurrency.
//
// PostgREST cannot express `current_stock = current_stock - n`, so the write
// is guarded by matching the stock value we based the calculation on. If
// another request changed it in between, the update matches zero rows and we
// re-read and retry rather than clobbering their change.
async function deductWithCompareAndSwap(match, allowInsufficientStock) {
  let expected = match.available

  for (let attempt = 1; attempt <= MAX_STOCK_WRITE_ATTEMPTS; attempt += 1) {
    if (!allowInsufficientStock && expected < match.required) {
      const error = new Error(
        `${match.item_name} only has ${expected} ${match.unit} in stock but JO requires ${match.required}.`
      )
      error.code = 'INSUFFICIENT_STOCK'
      error.shortages = [
        { item_name: match.item_name, unit: match.unit, available: expected, required: match.required },
      ]
      throw error
    }

    const nextStock = allowInsufficientStock
      ? Math.max(0, expected - match.required)
      : expected - match.required

    const { data: rows, error: updateError } = await supabase
      .from('inventory_items')
      .update({ current_stock: nextStock, updated_at: new Date().toISOString() })
      .eq('id', match.inventory_item_id)
      .eq('current_stock', expected)
      .select('id, item_name, current_stock, minimum_stock, unit')

    if (updateError) {
      console.error(`[inventory] FAILED to update stock for "${match.item_name}":`, updateError.message)
      const error = new Error(`Failed to update stock for ${match.item_name}: ${updateError.message}`)
      error.code = 'INVENTORY_UPDATE_FAILED'
      throw error
    }

    if (Array.isArray(rows) && rows.length === 1) {
      console.log(
        `[inventory] Deducted ${match.required} ${match.unit} from "${match.item_name}": ${expected} -> ${nextStock}`
      )
      return rows[0]
    }

    // Zero rows matched: someone else moved the stock. Re-read and retry.
    const { data: fresh, error: readError } = await supabase
      .from('inventory_items')
      .select('id, item_name, current_stock, minimum_stock, unit')
      .eq('id', match.inventory_item_id)
      .single()

    if (readError || !fresh) {
      const error = new Error(`Failed to re-read stock for ${match.item_name}`)
      error.code = 'INVENTORY_UPDATE_FAILED'
      throw error
    }

    expected = Number(fresh.current_stock || 0)
    console.warn(
      `[inventory] Stock for "${match.item_name}" changed during deduction — retry ${attempt}/${MAX_STOCK_WRITE_ATTEMPTS} at ${expected}`
    )
  }

  const error = new Error(
    `Could not deduct ${match.item_name}: stock kept changing after ${MAX_STOCK_WRITE_ATTEMPTS} attempts. Please retry.`
  )
  error.code = 'INVENTORY_UPDATE_CONFLICT'
  throw error
}

// Deducts stock for a job order, in JS rather than via the
// deduct_inventory_for_job_order RPC.
//
// NOTE ON THE RPC: an earlier comment here claimed that RPC "does not update
// current_stock". That is not accurate — re-reading sql/004_inventory.sql, it
// does update stock, insert the transaction, and return shortages, all in one
// transaction. What actually broke was the payload: the RPC resolves rows by
// item->>'inventory_item_id', and the JO items passed to it carried only
// item_no/item_name/reference_no/quantity, so every item hit `continue` and
// nothing moved. The id is now sent (see create-jo.js), so the RPC is a viable
// target again. Its own `new_stock` double-subtraction bug is fixed in
// sql/006_fix_deduct_rpc_new_stock.sql. Note the RPC has no equivalent of the
// duplicate-deduction guard below, so add one before switching back.
async function deductInventoryForJobOrder({
  items,
  jobOrderId,
  joNumber,
  performedBy,
  allowInsufficientStock = false,
}) {
  const inventoryItems = await loadInventoryItems()
  const { matches, shortages, unmatched } = getInventoryMatches(items, inventoryItems)

  if (unmatched.length > 0) {
    console.warn(
      `[inventory] ${unmatched.length} JO item(s) matched no inventory record and were NOT deducted:`,
      unmatched.map((u) => u.item_name).join(', ')
    )
  }

  if (shortages.length > 0 && !allowInsufficientStock) {
    const message = shortages
      .map((item) => `${item.item_name} only has ${item.available} ${item.unit} in stock but JO requires ${item.required}.`)
      .join(' ')
    const error = new Error(message)
    error.code = 'INSUFFICIENT_STOCK'
    error.shortages = shortages
    throw error
  }

  const deductions = []
  const transactions = []

  for (const match of matches) {
    // Defensive guard against double-deduction if this function is ever
    // called twice for the same job order (e.g. a retried request) —
    // skip silently if a stock_out transaction for this exact
    // (job_order_id, inventory_item_id) pair already exists.
    const { data: existing, error: existingError } = await supabase
      .from('inventory_transactions')
      .select('id')
      .eq('job_order_id', jobOrderId)
      .eq('inventory_item_id', match.inventory_item_id)
      .eq('transaction_type', 'stock_out')
      .maybeSingle()

    if (existingError) {
      console.warn('[inventory] Could not check for duplicate transaction:', existingError.message)
    }

    if (existing) {
      console.log(`[inventory] Already deducted for this JO+item — skipping: ${match.item_name}`)
      continue
    }

    // 1) Update the actual stock number, with a compare-and-swap so two
    // job orders deducting the same item concurrently cannot lose an update.
    // The previous version read the stock, computed an absolute value, and
    // wrote it back unconditionally — whichever request wrote last silently
    // erased the other's deduction.
    const updatedItem = await deductWithCompareAndSwap(match, allowInsufficientStock)


    // 2) Record the transaction for audit/history purposes.
    const { data: txn, error: txnError } = await supabase
      .from('inventory_transactions')
      .insert({
        inventory_item_id: match.inventory_item_id,
        transaction_type: 'stock_out',
        quantity: match.required,
        job_order_id: jobOrderId,
        remarks: `Used in ${joNumber || jobOrderId}`,
        performed_by: performedBy || null,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (txnError) {
      // The stock update already succeeded at this point — log loudly,
      // but don't throw, since the actual deduction (the part that
      // matters for correctness) already happened. A missing audit row
      // is a lesser problem than a wrong stock count.
      console.error(`[inventory] Stock updated but FAILED to log transaction for "${match.item_name}":`, txnError.message)
    } else {
      transactions.push(txn)
    }

    deductions.push({
      inventory_item_id: match.inventory_item_id,
      item_name: updatedItem.item_name,
      unit: updatedItem.unit,
      quantity_used: match.required,
      new_stock: updatedItem.current_stock,
      minimum_stock: updatedItem.minimum_stock,
    })
  }

  console.log(`[inventory] Deduction complete — ${deductions.length} item(s) deducted, ${transactions.length} transaction(s) logged.`)

  return { matches, shortages, deductions, transactions, unmatched }
}

module.exports = {
  previewInventoryUsage,
  deductInventoryForJobOrder,
}