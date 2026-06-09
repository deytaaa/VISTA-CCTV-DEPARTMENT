const supabase = require('../lib/supabase')
const { previewInventoryUsage } = require('../lib/inventory')

module.exports = {
  list: async (req, res) => {
    try {
      const { q, page = 1, limit = 50 } = req.query
      const from = (Number(page) - 1) * Number(limit)
      const to = from + Number(limit) - 1

      let query = supabase.from('inventory_items').select('*', { count: 'exact' }).order('item_name', { ascending: true })

      if (q) query = query.ilike('item_name', `%${q}%`)
      const { data, error, count } = await query.range(from, to)
      if (error) return res.status(500).json({ error: error.message || error })

      return res.json({ data, meta: { page: Number(page), limit: Number(limit), total: count ?? (Array.isArray(data) ? data.length : 0) } })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Failed to list inventory items' })
    }
  },

  previewUsage: async (req, res) => {
    try {
      const payload = req.body || {}
      const { matches, shortages } = await previewInventoryUsage(payload.items || [])
      return res.json({ data: { matches, shortages } })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Failed to preview inventory usage' })
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', id)
        .single()
      if (error) return res.status(404).json({ error: error.message || error })

      const { data: txs, error: txErr } = await supabase
        .from('inventory_transactions')
        .select('*, performed_by_user:users(id, name)')
        .eq('inventory_item_id', id)
        .order('created_at', { ascending: false })
      if (txErr) console.warn('Failed to fetch inventory transactions', txErr)

      const jobOrderIds = Array.from(new Set((txs || []).map((tx) => tx.job_order_id).filter(Boolean)))
      let jobOrders = []
      if (jobOrderIds.length > 0) {
        const { data: jobOrderData, error: joErr } = await supabase.from('job_orders').select('id, jo_number').in('id', jobOrderIds)
        if (!joErr) jobOrders = Array.isArray(jobOrderData) ? jobOrderData : []
      }

      const jobOrderMap = new Map(jobOrders.map((jobOrder) => [jobOrder.id, jobOrder]))
      const transactions = (txs || []).map((tx) => ({
        ...tx,
        job_order: tx.job_order_id ? jobOrderMap.get(tx.job_order_id) || null : null,
      }))

      return res.json({ data: { item: data, transactions } })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Failed to fetch inventory item' })
    }
  },

  create: async (req, res) => {
    try {
      const payload = req.body || {}
      if (!payload.item_name || !payload.unit) return res.status(400).json({ error: 'Item name and unit are required' })

      const insertObj = {
        item_name: payload.item_name,
        description: payload.description || null,
        unit: payload.unit,
        current_stock: payload.current_stock || 0,
        minimum_stock: payload.minimum_stock || 0,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from('inventory_items').insert(insertObj).select('*').single()
      if (error) return res.status(500).json({ error: error.message || error })
      return res.status(201).json({ data })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Failed to create inventory item' })
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params
      const payload = req.body || {}
      const { data, error } = await supabase.from('inventory_items').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
      if (error) return res.status(500).json({ error: error.message || error })
      return res.json({ data })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Failed to update inventory item' })
    }
  },

  remove: async (req, res) => {
    try {
      const { id } = req.params
      const { error } = await supabase.from('inventory_items').delete().eq('id', id)
      if (error) return res.status(500).json({ error: error.message || error })
      return res.json({ ok: true })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Failed to delete inventory item' })
    }
  },

  addStock: async (req, res) => {
    try {
      const { id } = req.params
      const { quantity, remarks } = req.body || {}
      const qty = Number(quantity || 0)
      if (!qty || qty <= 0) return res.status(400).json({ error: 'Quantity must be greater than zero' })

      const { error: stockError } = await supabase.rpc('inventory_stock_in', {
        p_inventory_item_id: id,
        p_quantity: qty,
        p_remarks: remarks || null,
        p_performed_by: req.user?.id || null,
      })

      if (stockError) return res.status(500).json({ error: stockError.message || stockError })

      const { data: updated, error: itemErr } = await supabase.from('inventory_items').select('*').eq('id', id).single()
      if (itemErr) return res.status(404).json({ error: itemErr.message || itemErr })

      return res.json({ data: { item: updated } })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Failed to add stock' })
    }
  },

  stockOut: async (req, res) => {
    try {
      const { id } = req.params
      const payload = req.body || {}
      const qty = Number(payload?.quantity ?? 0)
      const reason = String(payload?.reason || '').trim()
      const remarks = String(payload?.remarks || '').trim()

      if (!reason) return res.status(400).json({ error: 'Reason is required' })
      if (!qty || qty <= 0) return res.status(400).json({ error: 'Quantity must be greater than zero' })

      const { data: item, error: itemErr } = await supabase.from('inventory_items').select('*').eq('id', id).single()
      if (itemErr) return res.status(404).json({ error: itemErr.message || itemErr })

      const currentStock = Number(item?.current_stock ?? 0)
      const minimumStock = Number(item?.minimum_stock ?? 0)
      if (qty > currentStock) return res.status(400).json({ error: 'Insufficient stock' })

      const newStock = currentStock - qty

      const { error: updateErr } = await supabase.from('inventory_items').update({
        current_stock: newStock,
        updated_at: new Date().toISOString(),
      }).eq('id', id)

      if (updateErr) return res.status(500).json({ error: updateErr.message || updateErr })

      const performedBy = req.user?.id || null
      const transactionRemarks = `${reason}: ${remarks}`.trim()

      const { error: txErr } = await supabase.from('inventory_transactions').insert({
        inventory_item_id: id,
        transaction_type: 'stock_out',
        quantity: qty,
        job_order_id: null,
        remarks: transactionRemarks || null,
        performed_by: performedBy,
      })

      if (txErr) return res.status(500).json({ error: txErr.message || txErr })

      const { data: updatedItem, error: updatedItemErr } = await supabase.from('inventory_items').select('*').eq('id', id).single()
      if (updatedItemErr) return res.status(500).json({ error: updatedItemErr.message || updatedItemErr })

      // Low stock notification for all inventory users
      let notificationInserted = false
      if (newStock <= minimumStock) {
        const { data: inventoryUsers, error: usersErr } = await supabase.from('users').select('id').eq('role', 'inventory')
        if (!usersErr && Array.isArray(inventoryUsers) && inventoryUsers.length > 0) {
          const invIds = inventoryUsers.map((u) => u.id).filter(Boolean)
          if (invIds.length > 0) {
            const title = 'Low Stock Alert'
            const message = `⚠ Low Stock: ${updatedItem.item_name} now has ${newStock} ${updatedItem.unit} remaining.`
            const notifRows = invIds.map((userId) => ({
              user_id: userId,
              job_order_id: null,
              title,
              message,
              is_read: false,
            }))

            const { error: notifErr } = await supabase.from('notifications').insert(notifRows)
            if (!notifErr) notificationInserted = true
          }
        }
      }

      return res.json({
        data: {
          item: updatedItem,
          notificationInserted,
        },
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: 'Failed to deduct stock' })
    }
  },
}

