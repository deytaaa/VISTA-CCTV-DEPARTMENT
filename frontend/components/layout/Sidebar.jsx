import Link from 'next/link'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'

function navClass(active) {
  return active
    ? 'bg-[#AA0000] text-white'
    : 'text-white/90 hover:bg-[#AA0000] hover:text-white'
}

function IconWrapper({ children }) {
  return <span className="flex h-5 w-5 items-center justify-center text-current">{children}</span>
}

function DashboardIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 13h6V4H4v9zm10 7h6v-5h-6v5zM14 4h6v11h-6V4zM4 18h6v-3H4v3z" />
      </svg>
    </IconWrapper>
  )
}

function CreateIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14m-7-7h14" />
      </svg>
    </IconWrapper>
  )
}

function JobOrdersIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5h16M4 12h16M4 19h16" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5v14" />
      </svg>
    </IconWrapper>
  )
}

function ApprovedIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12l4 4L19 6" />
      </svg>
    </IconWrapper>
  )
}

function ApprovalIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z" />
      </svg>
    </IconWrapper>
  )
}

function ArchiveIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7h16M6 7v12h12V7M9 11h6" />
      </svg>
    </IconWrapper>
  )
}

function LogsIcon() {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    </IconWrapper>
  )
}

const iconByHref = {
  '/dashboard': DashboardIcon,
  '/jo/create': CreateIcon,
  '/jo': JobOrdersIcon,
  '/jo/approved': ApprovedIcon,
  '/jo/approval': ApprovalIcon,
  '/jo/archive': ArchiveIcon,
  '/logs': LogsIcon,
}

export default function Sidebar({ hidden = false, setHidden = () => {}, mobileOpen = false, setMobileOpen = () => {} }) {
  const router = useRouter()
  const { role } = useAuth()

  const items = useMemo(
    () => [
      { href: '/dashboard', label: 'Dashboard', roles: ['admin', 'technician'] },
      { href: '/jo/create', label: 'Create JO', roles: ['admin'] },
      { href: '/jo', label: 'Job Orders', roles: ['admin', 'technician'] },
      { href: '/jo/approved', label: 'Approved', roles: ['technician'] },
      { href: '/jo/approval', label: 'Approval Queue', roles: ['admin'] },
      { href: '/jo/archive', label: 'Archive', roles: ['admin'] },
      { href: '/logs', label: 'Activity Logs', roles: ['admin'] },
    ],
    []
  )

  const visibleItems = items.filter((item) => item.roles.includes(role || ''))

  return (
    <>
      {/* Desktop / persistent sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden h-screen flex-col bg-[#CC0000] text-white shadow-2xl transition-all duration-300 lg:flex lg:overflow-y-auto lg:overscroll-contain ${hidden ? 'w-0 overflow-hidden' : 'w-72'}`}
        aria-hidden={hidden}
      >
        <div className={`relative border-b border-white/15 ${hidden ? 'px-2 py-4' : 'px-6 py-6'}`}>
          <div className={`flex items-center gap-3 ${hidden ? 'justify-center' : ''}`}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <img src="/images/City_of_Taguig_logo.png" alt="City of Taguig logo" className="h-15 w-15 object-contain" />
            </div>
            {!hidden ? (
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] leading-4 text-white/75">City Government of Taguig</p>
                <h1 className="mt-1 text-lg font-black leading-tight tracking-tight">CCTV Department</h1>
              </div>
            ) : null}
          </div>
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
                  {hidden ? (
                    iconByHref[item.href] ? <span className="flex h-5 w-5 items-center justify-center">{iconByHref[item.href]({})}</span> : null
                  ) : (
                    <>
                      {iconByHref[item.href] ? <span className="text-white/95">{iconByHref[item.href]({})}</span> : null}
                      <span className="ml-3">{item.label}</span>
                    </>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        <div className={`border-t border-white/15 ${hidden ? 'px-0 py-3 text-center' : 'px-6 py-5 text-xs'}`}>
          {!hidden ? 'Governmen View' : null}
        </div>
      </aside>

      {/* Mobile slide-over sidebar */}
      <div className={`lg:hidden ${mobileOpen ? 'fixed inset-0 z-40' : 'hidden'}`} aria-hidden={!mobileOpen}>
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
              {visibleItems.map((item) => {
                const Icon = iconByHref[item.href]
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="flex items-center rounded-2xl px-4 py-3 text-sm font-semibold text-white/90 hover:bg-[#AA0000] hover:text-white">
                    {Icon ? <Icon /> : null}
                    <span className="ml-3">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>
      </div>
    </>
  )
}
