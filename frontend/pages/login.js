import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const next = typeof router.query.next === 'string' ? router.query.next : '/'
      router.replace(next)
    }
  }, [authLoading, isAuthenticated, router])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const next = typeof router.query.next === 'string' ? router.query.next : '/'
    router.replace(next)
  }

  if (authLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">
        Loading session...
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-white text-black">
      <div className="absolute inset-0">
        <img
          src="/images/cctv_login_bg.png"
          alt="Taguig city background"
          className="h-full w-full object-cover opacity-100"
        />
        <div className="absolute inset-0 bg-black/15" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-[28px] border border-gray-200 bg-white px-6 py-8 shadow-[0_10px_40px_rgba(0,0,0,0.08)] sm:px-8 sm:py-10">
        <div className="flex flex-col items-center text-center">
          <div className="h-20 w-20 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
            <img
              src="/images/City_of_Taguig_logo.png"
              alt="City of Taguig logo"
              className="h-16 w-16 object-contain"
            />
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">
            City Government of Taguig
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-black">
            CCTV Department
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Job Order Dispatching and Monitoring System
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Email Address
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-black focus-within:ring-4 focus-within:ring-gray-100">
              <span className="text-gray-400 text-lg">@</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="name@taguig.gov.ph"
                className="w-full bg-transparent text-sm text-black outline-none placeholder:text-gray-400"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Password
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-black focus-within:ring-4 focus-within:ring-gray-100">
              <span className="text-gray-400 text-lg">*</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                className="w-full bg-transparent text-sm text-black outline-none placeholder:text-gray-400"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="rounded-full px-2 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-black"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-2xl bg-black px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
          Authorized Taguig CCTV Department personnel only.
        </div>
        </div>
      </div>
    </div>
  )
}
