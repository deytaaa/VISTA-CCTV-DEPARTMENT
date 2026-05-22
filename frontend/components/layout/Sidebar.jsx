import Link from 'next/link'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'

function navClass(active) {
  return active
    ? 'bg-[#AA0000] text-white'
    : 'text-white/90 hover:bg-[#AA0000] hover:text-white'
}

export default function Sidebar() {
  const router = useRouter()
  const { role } = useAuth()

  const items = useMemo(
    () => [
      { href: '/dashboard', label: 'Dashboard', roles: ['admin', 'technician', 'supervisor'] },
      { href: '/jo/create', label: 'Create JO', roles: ['admin', 'supervisor'] },
      { href: '/jo/sent', label: 'Sent JO', roles: ['admin', 'technician', 'supervisor'] },
      { href: '/jo/pending', label: 'Pending JO', roles: ['admin', 'technician', 'supervisor'] },
      { href: '/jo/processing', label: 'Processing JO', roles: ['admin', 'technician', 'supervisor'] },
      { href: '/jo/completed', label: 'Completed JO', roles: ['admin', 'technician', 'supervisor'] },
      { href: '/jo/approval', label: 'Approval Queue', roles: ['admin', 'supervisor'] },
      { href: '/jo/archive', label: 'Archive', roles: ['admin', 'supervisor'] },
      { href: '/logs', label: 'Activity Logs', roles: ['admin', 'supervisor'] },
    ],
    []
  )

  const visibleItems = items.filter((item) => item.roles.includes(role || ''))

  return (
    <aside className="flex min-h-screen w-72 flex-col bg-[#CC0000] text-white shadow-2xl">
      <div className="border-b border-white/15 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <img src="/images/City_of_Taguig_logo.png" alt="City of Taguig logo" className="h-9 w-9 object-contain" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/75">City Government of Taguig</p>
            <h1 className="mt-1 text-lg font-black tracking-tight">CCTV Department</h1>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-5">
        <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Navigation</p>
        <div className="space-y-1">
          {visibleItems.map((item) => {
            const active = router.pathname === item.href || router.asPath === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${navClass(active)}`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-white/15 px-6 py-5 text-xs text-white/70">
        Government workflow view
      </div>
    </aside>
  )
}
