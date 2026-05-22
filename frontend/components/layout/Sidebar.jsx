import Link from 'next/link'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'

function navClass(active) {
  return active
    ? 'bg-[#AA0000] text-white'
    : 'text-white/90 hover:bg-[#AA0000] hover:text-white'
}

export default function Sidebar({ hidden = false, setHidden = () => {}, mobileOpen = false, setMobileOpen = () => {} }) {
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
    <>
      {/* Desktop / persistent sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden h-screen flex-col bg-[#CC0000] text-white shadow-2xl transition-all duration-300 md:flex md:overflow-y-auto md:overscroll-contain ${hidden ? 'w-0 overflow-hidden' : 'w-72'}`}
        aria-hidden={hidden}
      >
        <div className={`relative border-b border-white/15 ${hidden ? 'px-2 py-4' : 'px-6 py-6 pr-14'}`}>
          <div className={`flex items-center gap-3 ${hidden ? 'justify-center' : ''}`}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <img src="/images/City_of_Taguig_logo.png" alt="City of Taguig logo" className="h-9 w-9 object-contain" />
            </div>
            {!hidden ? (
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.35em] text-white/75">City Government of Taguig</p>
                <h1 className="mt-1 truncate text-lg font-black tracking-tight">CCTV Department</h1>
              </div>
            ) : null}
          </div>

          {/* Desktop close button (X) */}
          {!hidden ? (
            <button
              onClick={() => setHidden(true)}
              aria-label="Hide sidebar"
              className="absolute right-4 top-4 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow transition hover:scale-105"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>

        <nav className={`flex-1 ${hidden ? 'px-0 py-3' : 'px-4 py-5'}`}>
          {!hidden ? <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Navigation</p> : null}
          <div className="space-y-1">
            {visibleItems.map((item) => {
              const active = router.pathname === item.href || router.asPath === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center rounded-2xl ${hidden ? 'px-0 py-2 justify-center' : 'px-4 py-3'} text-sm font-semibold transition ${navClass(active)}`}
                >
                  {!hidden ? <span className="ml-3">{item.label}</span> : null}
                </Link>
              )
            })}
          </div>
        </nav>

        <div className={`border-t border-white/15 ${hidden ? 'px-0 py-3 text-center' : 'px-6 py-5 text-xs'}`}>
          {!hidden ? 'Government workflow view' : null}
        </div>
      </aside>

      {/* Mobile slide-over sidebar */}
      <div className={`md:hidden ${mobileOpen ? 'fixed inset-0 z-40' : 'hidden'}`} aria-hidden={!mobileOpen}>
        <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
        <div className={`fixed left-0 top-0 bottom-0 z-50 w-72 transform bg-[#CC0000] text-white shadow-2xl transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="border-b border-white/15 px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                  <img src="/images/City_of_Taguig_logo.png" alt="City of Taguig logo" className="h-9 w-9 object-contain" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/75">City Government of Taguig</p>
                  <h1 className="mt-1 text-lg font-black tracking-tight">CCTV Department</h1>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="h-9 w-9 flex items-center justify-center rounded-md bg-white text-black">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <nav className="px-4 py-5">
            <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Navigation</p>
            <div className="space-y-1">
              {visibleItems.map((item) => (
                <Link key={item.href} href={item.href} className="block rounded-2xl px-4 py-3 text-sm font-semibold text-white/90 hover:bg-[#AA0000] hover:text-white">
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </>
  )
}
