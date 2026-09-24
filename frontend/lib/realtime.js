// Realtime delivers one event per changed row, and a single job order write
// also trips the log_job_order_status_change trigger, which inserts into
// activity_logs. A dashboard subscribed to both tables therefore received at
// least two events for one user action and ran a full reload for each. Bulk
// writes (a JO with several inventory notifications) multiplied that further.
//
// createCoalescer collapses a burst of events into a single refresh on the
// trailing edge, so N events within the window cost one reload instead of N.
//
// Usage inside an effect:
//   const refresh = createCoalescer(loadDashboard)
//   channel.on('postgres_changes', { ... }, refresh)
//   return () => { refresh.cancel(); supabase.removeChannel(channel) }
export function createCoalescer(fn, delay = 400) {
  let timer = null

  const trigger = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn()
    }, delay)
  }

  // Must be called on unmount, otherwise a pending refresh fires against an
  // unmounted component.
  trigger.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  return trigger
}
