import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

function formatDate(value) {
  if (!value) return 'Now'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function formatAlertText(item) {
  if ((item?.action || '').toLowerCase().includes('new job order')) {
    return item.action
  }

  if ((item?.action || '').toLowerCase() === 'marked as completed') {
    return `JO ${item?.job_order?.jo_number || item?.job_order_id || '—'} has been completed and is awaiting your approval`
  }

  if ((item?.action || '').toLowerCase().startsWith('job order created with status')) {
    return `New Job Order ${item?.job_order?.jo_number || item?.job_order_id || '—'} has been assigned to you.`
  }

  if ((item?.action || '').toLowerCase().startsWith('status changed:')) {
    return item.action.replace(/status changed:\s*(\w+)\s*->\s*(\w+)/i, (_match, fromStatus, toStatus) => {
      const fromLabel = String(fromStatus).charAt(0).toUpperCase() + String(fromStatus).slice(1)
      const toLabel = String(toStatus).charAt(0).toUpperCase() + String(toStatus).slice(1)
      return `Status changed: ${fromLabel} -> ${toLabel}`
    })
  }

  return item?.action || 'Activity update'
}

export default function NotificationDropdown() {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const unreadCount = useMemo(() => items.length, [items.length])

  useEffect(() => {
    let mounted = true

    async function loadLogs() {
      if (!session?.access_token) return

      setLoading(true)
      try {
        const response = await fetch(`${API_BASE_URL}/api/logs?limit=8`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        const payload = await response.json()
        if (!response.ok) return
        if (!mounted) return
        setItems(Array.isArray(payload?.data) ? payload.data : [])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadLogs()

    const channel = supabase
      .channel('activity-logs-header')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => {
        loadLogs()
      })
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [session?.access_token])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-black shadow-sm"
      >
        Notifications
        <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-taguigRed px-2 py-0.5 text-xs font-bold text-white">
          {unreadCount}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-3 w-96 rounded-[20px] border border-gray-200 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-black">Recent Alerts</h3>
            <span className="text-xs text-gray-500">{loading ? 'Refreshing...' : `${items.length} items`}</span>
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto">
            {items.length === 0 ? (
              <p className="rounded-2xl bg-gray-50 px-3 py-3 text-sm text-gray-500">No recent activity.</p>
            ) : (
              items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-black">{formatAlertText(item)}</p>
                    <span className="text-[11px] text-gray-500">{formatDate(item.timestamp)}</span>
                  </div>
                  {item.job_order_id ? <p className="mt-1 text-xs text-gray-500">JO: {item.job_order?.jo_number || item.job_order_id}</p> : null}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
