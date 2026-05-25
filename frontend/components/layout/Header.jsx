import { useAuth } from '../../context/AuthContext'
import NotificationDropdown from '../shared/NotificationDropdown'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'

export default function Header({ title, subtitle, actions = null, mobileOpen = false, setMobileOpen = () => {}, sidebarHidden = false, setSidebarHidden = () => {} }) {
  const { user, role } = useAuth()
  const router = useRouter()

  async function handleSignOut() {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Sign out failed', err)
    }

    try {
      if (typeof window !== 'undefined') {
        window.localStorage.clear()
        window.sessionStorage.clear()
      }
    } catch (e) {
      // ignore
    }

    router.push('/login')
  }

  return (
    <header className={`border-b border-gray-200 bg-white px-4 py-3 text-black sm:px-6 lg:px-8 ${sidebarHidden ? 'pl-12' : ''}`}>
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* Mobile hamburger */}
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#CC0000] text-white md:hidden" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Desktop sidebar toggle */}
          <button
            onClick={() => setSidebarHidden((current) => !current)}
            aria-label={sidebarHidden ? 'Open sidebar' : 'Hide sidebar'}
            className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#CC0000] text-white"
          >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
          </button>

          {/* Mobile brand */}
          <div className="flex items-center gap-2 md:hidden">
            <img src="/images/City_of_Taguig_logo.png" alt="CCTV Logo" className="h-8 w-8 rounded-full object-contain" />
            <span className="text-sm font-black tracking-tight text-black">CCTV</span>
          </div>

          {/* Desktop title block */}
          <div className="hidden min-w-0 md:block">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">{subtitle || 'VISTA CCTV Department'}</p>
            <h1 className="text-2xl font-black tracking-tight text-black">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 md:ml-auto">
          <div className="hidden text-right lg:block">
            <p className="text-sm font-semibold text-black">{user?.email || 'User'}</p>
            <p className="text-xs uppercase tracking-[0.25em] text-gray-500">{role || 'No role'}</p>
          </div>

          <NotificationDropdown />
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-600 sm:px-4"
          >
            Sign Out
          </button>
          {actions}
        </div>
      </div>
    </header>
  )
}
