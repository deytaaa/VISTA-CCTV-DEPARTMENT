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
    <header className={`flex w-full flex-col gap-4 border-b border-gray-200 bg-white px-6 py-4 text-black md:flex-row md:items-center md:justify-between lg:px-8 ${sidebarHidden ? 'pl-12' : ''}`}>
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button className="md:hidden -ml-2 mr-2 h-10 w-10 inline-flex items-center justify-center rounded-md text-black" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Desktop reopen button when sidebar is collapsed */}
        {sidebarHidden ? (
          <button onClick={() => setSidebarHidden(false)} aria-label="Open sidebar" className="hidden md:inline-flex -ml-2 mr-2 h-10 w-10 items-center justify-center rounded-md bg-[#CC0000] text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        ) : null}

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">{subtitle || 'VISTA CCTV Department'}</p>
          <h1 className="text-2xl font-black tracking-tight text-black">{title}</h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 md:ml-auto">
        <div className="text-right">
          <p className="text-sm font-semibold text-black">{user?.email || 'User'}</p>
          <p className="text-xs uppercase tracking-[0.25em] text-gray-500">{role || 'No role'}</p>
        </div>
        <NotificationDropdown />
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-600"
        >
          Sign Out
        </button>
        {actions}
      </div>
    </header>
  )
}
