import ProtectedRoute from '../ProtectedRoute'
import Layout from '../layout/Layout'
import { useEffect, useState } from 'react'
import StatCard from './StatCard'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'




const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export default function InventoryDashboard() {
  const { session, loading: authLoading } = useAuth()

  const [counts, setCounts] = useState({ total: 0, in_stock: 0, low_stock: 0, out_of_stock: 0 })
  const [lowStockItems, setLowStockItems] = useState([])

  const [recentTxs, setRecentTxs] = useState([])
  const [recentLoading, setRecentLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    async function load() {
      if (authLoading) return

      const token = session?.access_token

      if (!token) return

      try {
        const res = await fetch(`${API_BASE_URL}/api/inventory`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        const payload = await res.json()

        if (!mounted) return
        const list = Array.isArray(payload?.data) ? payload.data : []
        const stats = { total: 0, in_stock: 0, low_stock: 0, out_of_stock: 0 }
        for (const it of list) {
          stats.total += 1
          const stock = Number(it.current_stock || 0)
          const min = Number(it.minimum_stock || 0)
          if (stock === 0) stats.out_of_stock += 1
          else if (stock <= min) stats.low_stock += 1
          else stats.in_stock += 1
        }
        setCounts(stats)
        setLowStockItems(list.filter((it) => Number(it.current_stock || 0) <= Number(it.minimum_stock || 0)))
      } catch (e) {
        // ignore
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [authLoading, session?.access_token])


  useEffect(() => {
    if (authLoading) return undefined
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
          const token = session?.access_token
          if (!token) return

          fetch(`${API_BASE_URL}/api/inventory`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => r.json())
            .then((payload) => {
              const list = Array.isArray(payload?.data) ? payload.data : []
              const stats = { total: 0, in_stock: 0, low_stock: 0, out_of_stock: 0 }
              for (const it of list) {
                stats.total += 1
                const stock = Number(it.current_stock || 0)
                const min = Number(it.minimum_stock || 0)
                if (stock === 0) stats.out_of_stock += 1
                else if (stock <= min) stats.low_stock += 1
                else stats.in_stock += 1
              }
              setCounts(stats)
              setLowStockItems(list.filter((it) => Number(it.current_stock || 0) <= Number(it.minimum_stock || 0)))
            })
            .catch(() => {})
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [authLoading, session?.access_token])

  useEffect(() => {
    if (authLoading) return undefined
    if (!session?.access_token) return undefined

    let mounted = true
    let intervalId = null

    async function fetchRecent() {
      const token = session?.access_token
      if (!token) return

      setRecentLoading(true)
      try {
        const res = await fetch(`${API_BASE_URL}/api/inventory/transactions/recent`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const payload = await res.json()
        if (!mounted) return
        setRecentTxs(Array.isArray(payload?.data) ? payload.data : [])
      } catch (e) {
        if (!mounted) return
        setRecentTxs([])
      } finally {
        if (mounted) setRecentLoading(false)
      }
    }

    fetchRecent()
    intervalId = setInterval(fetchRecent, 30000)

    return () => {
      mounted = false
      if (intervalId) clearInterval(intervalId)
    }
  }, [authLoading, session?.access_token])

  if (authLoading) {


    return (
      <ProtectedRoute>
        <Layout title="Inventory Dashboard" subtitle="Inventory Overview">
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="text-sm text-gray-500">Checking session...</div>
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Layout title="Inventory Dashboard" subtitle="Inventory Overview">
        <div className="mx-auto max-w-6xl">

          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Items" value={counts.total} />
            <StatCard label="In Stock" value={counts.in_stock} tone="success" />
            <StatCard label="Low Stock" value={counts.low_stock} tone="warning" />
            <StatCard label="Out of Stock" value={counts.out_of_stock} tone="danger" />
          </section>

          <section className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-black">Recent Stock Activity</h2>
                <p className="text-sm text-gray-500">Latest inventory movements</p>
              </div>
              <Link href="/inventory" className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-black hover:bg-gray-50">
                View All
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#FFF0F0] text-gray-700">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Item Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">JO No.</th>
                    <th className="px-4 py-3">Performed By</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLoading ? (
                    <tr className="border-t border-gray-100">
                      <td className="px-4 py-4 text-gray-500" colSpan={6}>
                        Loading recent activity...
                      </td>
                    </tr>
                  ) : recentTxs.length === 0 ? (
                    <tr className="border-t border-gray-100">
                      <td className="px-4 py-4 text-gray-500" colSpan={6}>
                        No recent activity.
                      </td>
                    </tr>
                  ) : (
                    recentTxs.map((tx) => {
                      const type = tx?.transaction_type === 'stock_in' ? 'Stock In' : 'Stock Out'
                      const isIn = tx?.transaction_type === 'stock_in'
                      const qty = Number(tx?.quantity ?? 0)
                      const signedQty = isIn ? `+${qty}` : `-${qty}`

                      return (
                        <tr key={tx?.id} className="border-t border-gray-100 align-top">
                          <td className="px-4 py-3 text-gray-700">
                            {tx?.created_at ? new Date(tx.created_at).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3 font-medium text-black">{tx?.inventory_items?.item_name || '—'}</td>
                          <td className="px-4 py-3 text-gray-700">{type}</td>
                          <td className="px-4 py-3">
                            <span className={`font-semibold ${isIn ? 'text-emerald-700' : 'text-red-700'}`}>{signedQty}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{tx?.job_order?.jo_number || '—'}</td>
                          <td className="px-4 py-3 text-gray-700">{tx?.performer?.name || '—'}</td>

                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {lowStockItems.length > 0 ? (
            <div className="mt-6 rounded-[24px] border border-yellow-200 bg-yellow-50 px-4 py-4 text-sm font-medium text-yellow-800">
              ⚠ Low Stock Alert:{' '}
              {lowStockItems
                .slice(0, 4)
                .map(
                  (item) => `${item.item_name} (${Number(item.current_stock || 0)} ${item.unit || ''} remaining)`
                )
                .join(', ')}
              {lowStockItems.length > 4 ? '…' : ''}
            </div>
          ) : null}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
