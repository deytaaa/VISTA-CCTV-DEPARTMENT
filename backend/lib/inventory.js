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

async function deductInventoryForJobOrder({ items, jobOrderId, joNumber, performedBy, allowInsufficientStock = false }) {
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

  const { data, error } = await supabase.rpc('deduct_inventory_for_job_order', {
    p_items: items,
    p_job_order_id: jobOrderId,
    p_jo_number: joNumber || null,
    p_performed_by: performedBy || null,
    p_allow_insufficient_stock: Boolean(allowInsufficientStock),
  })

  if (error) {
    const shortageError = new Error(error.message || 'Failed to deduct inventory')
    shortageError.code = error.code || 'INVENTORY_DEDUCTION_FAILED'
    shortageError.shortages = shortages
    throw shortageError
  }

  return { matches, shortages: data?.shortages || shortages, deductions: data?.deductions || [], transactions: [] }
}

module.exports = {
  normalizeName,
  previewInventoryUsage,
  deductInventoryForJobOrder,
}
