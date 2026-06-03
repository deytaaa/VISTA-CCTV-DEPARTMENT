import ProtectedRoute from '../ProtectedRoute'
import Layout from '../layout/Layout'
import { useEffect, useState } from 'react'
import StatCard from './StatCard'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'




const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export default function InventoryDashboard() {
  const { session, loading: authLoading } = useAuth()

  const [counts, setCounts] = useState({ total: 0, in_stock: 0, low_stock: 0, out_of_stock: 0 })
  const [lowStockItems, setLowStockItems] = useState([])

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
    return () => { mounted = false }
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
          // Trigger same REST re-fetch used by the initial load effect
          // (stock updates in backend should emit postgres_changes).
          // Reusing load by reloading dashboard data via API.
          // Note: load() is inside another effect; re-run by forcing a state change is unnecessary.
          // Instead, call the API directly again here to keep behavior consistent.
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

          {lowStockItems.length > 0 ? (
            <div className="mb-6 rounded-[24px] border border-yellow-200 bg-yellow-50 px-4 py-4 text-sm font-medium text-yellow-800">
              ⚠ Low Stock Alert:{' '}
              {lowStockItems
                .slice(0, 4)
                .map((item) => `${item.item_name} (${Number(item.current_stock || 0)} ${item.unit || ''} remaining)`) 
                .join(', ')}
              {lowStockItems.length > 4 ? '…' : ''}
            </div>
          ) : null}
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
