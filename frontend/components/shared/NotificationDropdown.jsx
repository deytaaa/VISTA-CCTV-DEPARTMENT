import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'

function formatDate(value) {
  if (!value) return 'Now'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function formatAlertText(item) {
  return item?.message || item?.title || item?.action || 'Notification'
}

export default function NotificationDropdown() {
  const { session, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const visibleItems = useMemo(() => items, [items])

  async function loadUnreadCount() {
    if (!session?.access_token || !user?.id) return

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    setUnreadCount(Number(count || 0))
  }

  async function loadNotifications() {
    if (!session?.access_token || !user?.id) return

    setLoading(true)
    try {
      const [{ data }, unreadResult] = await Promise.all([
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false),
      ])

      setItems(Array.isArray(data) ? data : [])
      setUnreadCount(Number(unreadResult?.count || 0))
    } finally {
      setLoading(false)
    }
  }

  async function markNotificationRead(notificationId) {
    if (!session?.access_token || !user?.id) return

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id)

    await loadNotifications()
  }

  async function markAllAsRead() {
    if (!session?.access_token || !user?.id) return

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    await loadNotifications()
  }

  async function deleteNotification(notificationId) {
    if (!session?.access_token || !user?.id) return

    const target = items.find((item) => item.id === notificationId)
    const wasUnread = Boolean(target && !target.is_read)

    setItems((current) => current.filter((item) => item.id !== notificationId))
    if (wasUnread) {
      setUnreadCount((current) => Math.max(0, current - 1))
    }

    await supabase.from('notifications').delete().eq('id', notificationId).eq('user_id', user.id)
  }

  useEffect(() => {
    let mounted = true

    loadNotifications()
    loadUnreadCount()

    const channel = supabase
      .channel('notifications-header')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        loadNotifications()
      })
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [session?.access_token, user?.id])

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
          <div className="mb-3 flex items-start justify-between gap-3">
            <h3 className="text-sm font-bold text-black">Recent Alerts</h3>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={loading || unreadCount === 0}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark All as Read
            </button>
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto">
            {visibleItems.length === 0 ? (
              <p className="rounded-2xl bg-gray-50 px-3 py-3 text-sm text-gray-500">No recent activity.</p>
            ) : (
              visibleItems.map((item) => {
                const isRead = Boolean(item.is_read)

                return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => markNotificationRead(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      markNotificationRead(item.id)
                    }
                  }}
                  className={`cursor-pointer rounded-2xl border px-3 py-3 transition ${
                    isRead
                      ? 'border-gray-100 bg-gray-50'
                      : 'border-blue-200 bg-white shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      {!isRead ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" /> : null}
                      <div className="min-w-0">
                        <p className={`text-sm ${isRead ? 'font-normal text-gray-700' : 'font-semibold text-black'}`}>
                          {formatAlertText(item)}
                        </p>
                        {item.job_order_id ? <p className="mt-1 text-xs text-gray-500">JO: {item.job_order?.jo_number || item.job_order_id}</p> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[11px] text-gray-500">{formatDate(item.created_at)}</span>
                      <button
                        type="button"
                        aria-label="Delete notification"
                        onClick={(event) => {
                          event.stopPropagation()
                          deleteNotification(item.id)
                        }}
                        className="rounded-full px-2 py-1 text-xs text-gray-500 transition hover:bg-red-50 hover:text-red-700"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
