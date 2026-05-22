import Link from 'next/link'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard() {
  const { user } = useAuth()

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-lightGrayBg p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">VISTA CCTV — Dashboard</h1>
          <nav className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <Link href="/create-jo" className="px-3 py-2 bg-taguigRed text-white rounded">Create JO</Link>
            <button onClick={handleSignOut} className="px-3 py-2 bg-gray-200 rounded text-sm">Sign out</button>
          </nav>
        </header>
        <section className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow">Total JOs<br/><strong>—</strong></div>
          <div className="bg-white p-4 rounded shadow">Processing<br/><strong>—</strong></div>
          <div className="bg-white p-4 rounded shadow">For Approval<br/><strong>—</strong></div>
        </section>
      </div>
    </div>
    </ProtectedRoute>
  )
}
