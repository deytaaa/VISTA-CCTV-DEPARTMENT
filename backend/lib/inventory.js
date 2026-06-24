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
  const inventoryMap = new Map(inventoryItems.map((item) => [normalizeName(item.item_name), item]))
  const matches = []
  const shortages = []

  for (const item of Array.isArray(items) ? items : []) {
    const inventoryItem = inventoryMap.get(normalizeName(item?.item_name))
    const required = Number(item?.quantity || 0)

    if (!inventoryItem || !required) continue

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

  return { matches, shortages }
}

async function previewInventoryUsage(items) {
  const inventoryItems = await loadInventoryItems()
  return getInventoryMatches(items, inventoryItems)
}

// REPLACED the previous supabase.rpc('deduct_inventory_for_job_order', ...)
// call. That RPC was confirmed (via direct SQL inspection during testing)
// to insert a row into inventory_transactions but NOT actually update
// inventory_items.current_stock — meaning every JO created with inventory
// items appeared to deduct successfully (no error thrown, transaction
// logged) while the real stock number never moved. Doing the update and
// insert directly here, with explicit error checking on each step, makes
// failures visible instead of silent.
async function deductInventoryForJobOrder({
  items,
  jobOrderId,
  joNumber,
  performedBy,
  allowInsufficientStock = false,
}) {
  const inventoryItems = await loadInventoryItems()
  const { matches, shortages } = getInventoryMatches(items, inventoryItems)

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
    const newStock = allowInsufficientStock
      ? Math.max(0, match.available - match.required)
      : match.available - match.required

    console.log(
      `[inventory] Deducting ${match.required} ${match.unit} from "${match.item_name}": ${match.available} -> ${newStock}`
    )

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

    // 1) Update the actual stock number. This is the step the old RPC
    // silently failed to do.
    const { data: updatedItem, error: updateError } = await supabase
      .from('inventory_items')
      .update({
        current_stock: newStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', match.inventory_item_id)
      .select('id, item_name, current_stock, minimum_stock, unit')
      .single()

    if (updateError) {
      console.error(`[inventory] FAILED to update stock for "${match.item_name}":`, updateError.message)
      // Surface this loudly rather than continuing silently — a failed
      // stock update should not be treated as if deduction succeeded.
      const error = new Error(`Failed to update stock for ${match.item_name}: ${updateError.message}`)
      error.code = 'INVENTORY_UPDATE_FAILED'
      throw error
    }

    console.log(`[inventory] Stock updated successfully: ${match.item_name} is now ${updatedItem.current_stock} ${updatedItem.unit}`)

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

  return { matches, shortages, deductions, transactions }
}

module.exports = {
  normalizeName,
  previewInventoryUsage,
  deductInventoryForJobOrder,
}