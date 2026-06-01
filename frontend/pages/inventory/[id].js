import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import ProtectedRoute from '../../components/ProtectedRoute'
import Layout from '../../components/layout/Layout'
import { useAuth } from '../../context/AuthContext'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export default function InventoryItemPage() {
  const { session } = useAuth()
  const router = useRouter()
  const { id } = router.query
  const [item, setItem] = useState(null)
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    if (!session) return
    if (!session?.access_token) return

    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE_URL}/api/inventory/${id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const payload = await res.json()
        if (!mounted) return
        setItem(payload?.data?.item || null)
        setTxs(Array.isArray(payload?.data?.transactions) ? payload.data.transactions : [])
      } catch (e) {
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [id, session])

  return (
    <ProtectedRoute allowedRoles={['inventory']}>
      <Layout title="Inventory Item" subtitle={item?.item_name || 'Item'}>
        <div className="mx-auto max-w-4xl">
          <section className="mb-6 rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold">{item?.item_name}</h3>
            <p className="text-sm text-gray-600">Unit: {item?.unit} • Current: {item?.current_stock} • Min: {item?.minimum_stock}</p>
          </section>

          <section className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold mb-3">Transaction History</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#FFF0F0] text-gray-700">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">JO No.</th>
                    <th className="px-4 py-3">Remarks</th>
                    <th className="px-4 py-3">Performed By</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td className="px-4 py-4 text-gray-500" colSpan={6}>Loading...</td></tr>
                  ) : txs.length === 0 ? (
                    <tr><td className="px-4 py-4 text-gray-500" colSpan={6}>No transactions.</td></tr>
                  ) : (
                    txs.map((t) => (
                      <tr key={t.id} className="border-t border-gray-100">
                        <td className="px-4 py-3">{new Date(t.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3">{t.transaction_type === 'stock_in' ? 'Stock In' : 'Stock Out'}</td>
                        <td className="px-4 py-3">{t.transaction_type === 'stock_in' ? `+${t.quantity}` : `-${t.quantity}`}</td>
                        <td className="px-4 py-3">{t.job_order?.jo_number || '—'}</td>
                        <td className="px-4 py-3">{t.remarks || '—'}</td>
                        <td className="px-4 py-3">{t.performed_by_user?.name || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
