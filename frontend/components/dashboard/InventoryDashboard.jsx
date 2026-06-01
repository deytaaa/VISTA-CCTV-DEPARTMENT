import ProtectedRoute from '../ProtectedRoute'
import Layout from '../layout/Layout'
import { useEffect, useState } from 'react'
import StatCard from './StatCard'
import { useAuth } from '../../context/AuthContext'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export default function InventoryDashboard() {
  const { session } = useAuth()
  const [counts, setCounts] = useState({ total: 0, in_stock: 0, low_stock: 0, out_of_stock: 0 })
  const [lowStockItems, setLowStockItems] = useState([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/inventory`, {
          headers: { Authorization: `Bearer ${session?.access_token || ''}` },
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
  }, [session?.access_token])

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
