import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '../../components/ProtectedRoute'
import Layout from '../../components/layout/Layout'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

const UNIT_OPTIONS = ['pieces', 'meters', 'sets', 'rolls', 'boxes']
const STATUS_OPTIONS = ['all', 'in_stock', 'low_stock', 'out_of_stock']

function getStatusInfo(item) {
  const stock = Number(item?.current_stock || 0)
  const minimum = Number(item?.minimum_stock || 0)

  if (stock === 0) {
    return { label: 'Out of Stock', tone: 'bg-red-50 text-red-700 ring-red-200' }
  }

  if (stock <= minimum) {
    return { label: 'Low Stock', tone: 'bg-yellow-50 text-yellow-700 ring-yellow-200' }
  }

  return { label: 'In Stock', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
}

function emptyItemForm() {
  return {
    id: null,
    item_name: '',
    description: '',
    unit: 'pieces',
    current_stock: 0,
    minimum_stock: 0,
  }
}

const exportToCSV = (rows, filename) => {
  if (!rows || rows.length === 0) return

  const escapeCell = (value) => {
    const str = value === null || value === undefined ? '' : String(value)
    return `"${str.replace(/"/g, '""')}"`
  }

  const headers = Object.keys(rows[0])
  const csvRows = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(',')),
  ]
    .join('\n')

  const blob = new Blob([csvRows], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function InventoryPage() {
  const { session, user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [toast, setToast] = useState(null)
  const [saving, setSaving] = useState(false)

  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [itemForm, setItemForm] = useState(emptyItemForm())

  const [stockModalItem, setStockModalItem] = useState(null)
  const [stockQuantity, setStockQuantity] = useState('')
  const [stockRemarks, setStockRemarks] = useState('New delivery from supplier')
  const [stockLoading, setStockLoading] = useState(false)

  const [stockOutModalItem, setStockOutModalItem] = useState(null)
  const [stockOutQuantity, setStockOutQuantity] = useState('')
  const [stockOutReason, setStockOutReason] = useState('Damaged')
  const [stockOutRemarks, setStockOutRemarks] = useState('')
  const [stockOutLoading, setStockOutLoading] = useState(false)


  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const authHeaders = useMemo(() => {
    const headers = {}
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
    return headers
  }, [session?.access_token])

  async function loadItems() {
    if (!session?.access_token) return

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/inventory`, { headers: authHeaders })
      const payload = await res.json()
      setItems(Array.isArray(payload?.data) ? payload.data : [])
    } catch (error) {
      setToast({ type: 'error', message: error.message || 'Failed to load inventory items' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  useEffect(() => {
    if (!session?.access_token) return undefined

    const channel = supabase
      .channel('inventory-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items',
        },
        () => {
          loadItems()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session?.access_token])


  useEffect(() => {
    if (!toast) return undefined

    const timer = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(timer)
  }, [toast])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = !search || item.item_name?.toLowerCase().includes(search.toLowerCase())
      const status = getStatusInfo(item).label.toLowerCase().replace(/\s+/g, '_')
      const matchesStatus = statusFilter === 'all' || status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [items, search, statusFilter])

  const lowStockItems = useMemo(() => {
    return items
      .filter((item) => Number(item.current_stock || 0) <= Number(item.minimum_stock || 0))
      .map((item) => `${item.item_name} (${item.current_stock}${item.unit ? item.unit : ''} remaining)`)
  }, [items])

  function openCreateModal() {
    setItemForm(emptyItemForm())
    setItemModalOpen(true)
  }

  function openEditModal(item) {
    setItemForm({
      id: item.id,
      item_name: item.item_name || '',
      description: item.description || '',
      unit: item.unit || 'pieces',
      current_stock: Number(item.current_stock || 0),
      minimum_stock: Number(item.minimum_stock || 0),
    })
    setItemModalOpen(true)
  }

  function openStockModal(item) {
    setStockModalItem(item)
    setStockQuantity('')
    setStockRemarks('New delivery from supplier')
  }

  function openStockOutModal(item) {
    setStockOutModalItem(item)
    setStockOutQuantity('')
    setStockOutReason('Damaged')
    setStockOutRemarks('')
  }


  async function saveItem() {
    if (!itemForm.item_name.trim() || !itemForm.unit) {
      setToast({ type: 'error', message: 'Item name and unit are required.' })
      return
    }

    setSaving(true)
    try {
      const isEdit = Boolean(itemForm.id)
      const response = await fetch(`${API_BASE_URL}/api/inventory${isEdit ? `/${itemForm.id}` : ''}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          item_name: itemForm.item_name.trim(),
          description: itemForm.description.trim() || null,
          unit: itemForm.unit,
          minimum_stock: Number(itemForm.minimum_stock || 0),
        }),
      })



      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Failed to save item')

      setToast({ type: 'success', message: isEdit ? 'Item updated.' : 'Item added.' })
      setItemModalOpen(false)
      setItemForm(emptyItemForm())
      await loadItems()
    } catch (error) {
      setToast({ type: 'error', message: error.message })
    } finally {
      setSaving(false)
    }
  }

  async function saveStock() {
    const qty = Number(stockQuantity || 0)
    if (!stockModalItem || !qty || qty <= 0) {
      setToast({ type: 'error', message: 'Enter a valid quantity to add.' })
      return
    }

    setStockLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory/${stockModalItem.id}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ quantity: qty, remarks: stockRemarks.trim() }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Failed to update stock')

      const updatedItem = payload?.data?.item
      setToast({
        type: 'success',
        message: `Stock updated. ${updatedItem?.item_name || stockModalItem.item_name} now has ${updatedItem?.current_stock ?? stockModalItem.current_stock + qty} ${updatedItem?.unit || stockModalItem.unit}.`,
      })
      setStockModalItem(null)
      await loadItems()
    } catch (error) {
      setToast({ type: 'error', message: error.message })
    } finally {
      setStockLoading(false)
    }
  }

  async function saveStockOut() {
    const qty = Number(stockOutQuantity || 0)
    if (!stockOutModalItem) return

    const currentStock = Number(stockOutModalItem.current_stock || 0)
    const unit = stockOutModalItem.unit || ''

    if (!stockOutReason) {
      setToast({ type: 'error', message: 'Reason is required' })
      return
    }

    if (!qty || qty <= 0) {
      setToast({ type: 'error', message: 'Enter a valid quantity to use.' })
      return
    }

    if (qty > currentStock) {
      setToast({ type: 'error', message: 'Insufficient stock' })
      return
    }

    setStockOutLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory/items/${stockOutModalItem.id}/stock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          quantity: qty,
          reason: stockOutReason,
          remarks: stockOutRemarks.trim(),
        }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Failed to update stock')

      const updatedItem = payload?.data?.item
      const newStock = Number(updatedItem?.current_stock ?? currentStock - qty)

      setToast({
        type: 'success',
        message: `Stock updated. ${updatedItem?.item_name || stockOutModalItem.item_name} now has ${newStock} ${updatedItem?.unit || unit} remaining.`,
      })

      setStockOutModalItem(null)
      await loadItems()
    } catch (error) {
      setToast({ type: 'error', message: error.message })
    } finally {
      setStockOutLoading(false)
    }
  }


  async function deleteItem() {
    if (!deleteTarget) return

    setDeleteLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Failed to delete item')

      setToast({ type: 'success', message: 'Inventory item deleted.' })
      setDeleteTarget(null)
      await loadItems()
    } catch (error) {
      setToast({ type: 'error', message: error.message })
    } finally {
      setDeleteLoading(false)
    }
  }

  const date = new Date().toISOString().slice(0, 10)
  const exportRowsForFiltered = filteredItems.map((item) => {
    const statusInfo = getStatusInfo(item)
    return {
      'Item Name': item.item_name,
      Unit: item.unit,
      'Current Stock': Number(item.current_stock || 0),
      'Min Stock': Number(item.minimum_stock || 0),
      Status: statusInfo.label,
    }
  })

  return (
    <ProtectedRoute allowedRoles={['inventory']}>
      <Layout title="Inventory" subtitle="Inventory Management">
        <div className="mx-auto max-w-6xl space-y-6">

          {toast ? (
            <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {toast.message}
            </div>
          ) : null}

          <div className="inventory-toolbar rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            {/* Row 1 (tablet): Search + Status side-by-side, full width */}
            <div className="inventory-toolbar-row1 flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-4">
              <div className="min-w-0 flex-1">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Search</label>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search item name..." className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black" />
              </div>

              <div className="min-w-0 flex-1">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black">
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === 'all' ? 'All Statuses' : option.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2 (tablet): Clear left; Export + Add right */}
            <div className="inventory-toolbar-row2 mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setSearch(''); setStatusFilter('all') }} className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-black hover:bg-gray-50 whitespace-nowrap">
                  Clear Filters
                </button>
              </div>

              <div className="flex items-center gap-3 flex-nowrap">
                <button
                  type="button"
                  onClick={() => {
                    exportToCSV(exportRowsForFiltered, `inventory-report-${date}.csv`)
                  }}
                  className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-gray-50 whitespace-nowrap"
                  disabled={filteredItems.length === 0}
                >
                  Export CSV
                </button>

                <button type="button" onClick={openCreateModal} className="rounded-2xl bg-taguigRed px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/10 hover:bg-taguigDark whitespace-nowrap">
                  Add New Item
                </button>
              </div>
            </div>
          </div>

          {lowStockItems.length > 0 ? (
            <div className="rounded-[24px] border border-yellow-200 bg-yellow-50 px-4 py-4 text-sm font-medium text-yellow-800">
              ⚠ Low Stock Alert: {lowStockItems.join(', ')}
            </div>
          ) : null}

          <section className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#FFF0F0] text-gray-700">
                  <tr>
                    <th className="px-4 py-3">Item Name</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Current Stock</th>
                    <th className="px-4 py-3">Min Stock</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-4 py-4 text-gray-500" colSpan={6}>
                        Loading...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-gray-500" colSpan={6}>
                        No items found.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const statusInfo = getStatusInfo(item)

                      return (
                        <tr key={item.id} className="border-t border-gray-100 align-top">
                          <td className="px-4 py-3 font-medium text-black">{item.item_name}</td>
                          <td className="px-4 py-3 text-gray-700">{item.unit}</td>
                          <td className="px-4 py-3 text-gray-700">{Number(item.current_stock || 0)}</td>
                          <td className="px-4 py-3 text-gray-700">{Number(item.minimum_stock || 0)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusInfo.tone}`}>{statusInfo.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <Link href={`/inventory/${item.id}`} className="rounded-2xl border border-gray-200 px-3 py-2 text-xs font-semibold text-black hover:bg-gray-50">
                                View History
                              </Link>
                              <button type="button" onClick={() => openStockModal(item)} className="rounded-2xl border border-gray-200 px-3 py-2 text-xs font-semibold text-black hover:bg-gray-50">
                                + Add Stock
                              </button>
                              <button type="button" onClick={() => openStockOutModal(item)} className="rounded-2xl border border-gray-200 px-3 py-2 text-xs font-semibold text-black hover:bg-gray-50">
                                - Use Stock
                              </button>

                              <button type="button" onClick={() => openEditModal(item)} className="rounded-2xl border border-gray-200 px-3 py-2 text-xs font-semibold text-black hover:bg-gray-50">
                                Edit
                              </button>
                              <button type="button" onClick={() => setDeleteTarget(item)} className="rounded-2xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {itemModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-black">{itemForm.id ? 'Edit Inventory Item' : 'Add New Item'}</h3>
                  <p className="text-sm text-gray-500">Manage inventory master data.</p>
                </div>
                <button type="button" onClick={() => setItemModalOpen(false)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold">Close</button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Item Name</label>
                  <input value={itemForm.item_name} onChange={(e) => setItemForm((current) => ({ ...current, item_name: e.target.value }))} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Description</label>
                  <textarea value={itemForm.description} onChange={(e) => setItemForm((current) => ({ ...current, description: e.target.value }))} rows={3} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Unit</label>
                  <select value={itemForm.unit} onChange={(e) => setItemForm((current) => ({ ...current, unit: e.target.value }))} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black">
                    {UNIT_OPTIONS.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Current Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.current_stock}
                    readOnly
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none"
                  />
                  <p className="mt-2 text-xs text-gray-500">Use Add Stock to update quantity</p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Minimum Stock</label>
                  <input type="number" min="0" value={itemForm.minimum_stock} onChange={(e) => setItemForm((current) => ({ ...current, minimum_stock: e.target.value }))} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black" />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setItemModalOpen(false)} className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-black hover:bg-gray-50">
                  Cancel
                </button>
                <button type="button" onClick={saveItem} disabled={saving} className="rounded-2xl bg-taguigRed px-5 py-3 text-sm font-semibold text-white hover:bg-taguigDark disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {stockModalItem ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-black">Add Stock</h3>
                  <p className="text-sm text-gray-500">Record incoming stock for {stockModalItem.item_name}.</p>
                </div>
                <button type="button" onClick={() => setStockModalItem(null)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold">Close</button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Item</label>
                  <input value={stockModalItem.item_name} readOnly className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Current Stock</label>
                  <input value={stockModalItem.current_stock} readOnly className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Add Quantity</label>
                  <input type="number" min="1" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Remarks</label>
                  <textarea value={stockRemarks} onChange={(e) => setStockRemarks(e.target.value)} rows={3} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black" />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setStockModalItem(null)} className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-black hover:bg-gray-50">
                  Cancel
                </button>
                <button type="button" onClick={saveStock} disabled={stockLoading} className="rounded-2xl bg-taguigRed px-5 py-3 text-sm font-semibold text-white hover:bg-taguigDark disabled:opacity-60">
                  {stockLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {stockOutModalItem ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-black">Stock Out</h3>
                  <p className="text-sm text-gray-500">Deduct stock for {stockOutModalItem.item_name}.</p>
                </div>
                <button type="button" onClick={() => setStockOutModalItem(null)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold">Close</button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Item Name</label>
                  <input value={stockOutModalItem.item_name} readOnly className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Current Stock</label>
                  <input value={stockOutModalItem.current_stock} readOnly className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Quantity to Deduct</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stockOutQuantity}
                    onChange={(e) => setStockOutQuantity(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Reason</label>
                  <select
                    value={stockOutReason}
                    onChange={(e) => setStockOutReason(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                  >
                    {['Damaged', 'Lost', 'Expired', 'Returned', 'Other'].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Remarks</label>
                  <input
                    value={stockOutRemarks}
                    onChange={(e) => setStockOutRemarks(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </div>
              </div>


              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setStockOutModalItem(null)} className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-black hover:bg-gray-50">
                  Cancel
                </button>
                <button type="button" onClick={saveStockOut} disabled={stockOutLoading} className="rounded-2xl bg-taguigRed px-5 py-3 text-sm font-semibold text-white hover:bg-taguigDark disabled:opacity-60">
                  {stockOutLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ) : null}


        {deleteTarget ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
              <h3 className="text-xl font-black text-black">Delete Item</h3>
              <p className="mt-2 text-sm text-gray-600">Delete <span className="font-semibold text-black">{deleteTarget.item_name}</span>? This cannot be undone.</p>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-black hover:bg-gray-50">
                  Cancel
                </button>
                <button type="button" onClick={deleteItem} disabled={deleteLoading} className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Layout>
    </ProtectedRoute>
  )
}
