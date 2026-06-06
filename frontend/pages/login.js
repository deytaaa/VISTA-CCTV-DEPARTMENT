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

  function getNextPath() {
    const next = typeof router.query.next === 'string' ? router.query.next : '/dashboard'
    return next && next !== '/' ? next : '/dashboard'
  }

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(getNextPath())
    }
  }, [authLoading, isAuthenticated, router])


  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Wait for Supabase auth session to be fully established before redirecting.
    // Additionally wait for AuthContext's `loading` to finish to avoid route-fetch aborts.
    const waitForSession = async () => {
      const { data: current } = await supabase.auth.getSession()
      if (current?.session) return current.session

      return new Promise((resolve) => {
        const subscription = supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (nextSession?.session) {
            subscription?.data?.subscription?.unsubscribe?.()
            subscription?.unsubscribe?.()
            resolve(nextSession.session)
          }
        })

        setTimeout(() => {
          subscription?.data?.subscription?.unsubscribe?.()
          subscription?.unsubscribe?.()
          resolve(null)
        }, 5000)
      })
    }

    const waitForAuthContext = async () => {
      // AuthContext uses `loading` to indicate it has synced session/profile.
      const start = Date.now()
      const timeoutMs = 7000

      return new Promise((resolve) => {
        const tick = () => {
          // `authLoading` and `isAuthenticated` come from hook state; polling ensures we wait for them.
          if (!authLoading && isAuthenticated) {
            resolve(true)
            return
          }
          if (Date.now() - start > timeoutMs) {
            resolve(false)
            return
          }
          setTimeout(tick, 100)
        }

        tick()
      })
    }


    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const { data: authUserData, error: userError } = await supabase.auth.getUser()
    if (userError) {
      setError(userError.message)
      setLoading(false)
      return
    }

    const accessToken = data?.session?.access_token
    if (accessToken && authUserData?.user?.id) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      } catch (refreshError) {
        console.error('Failed to refresh user profile after login', refreshError)
      }
    }

    // Ensure session is ready before navigating to /dashboard
    await waitForSession()

    // Wait for AuthContext to finish syncing before navigating.
    // Show spinner while waiting.
    await waitForAuthContext()

    router.replace(getNextPath())

  }

  if (authLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">
        Loading session...
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-150 text-black">
      <div className="absolute inset-0">
        <img
          src="/images/cctv_login_bg.png"
          alt="Taguig city background"
          className="h-full w-full object-cover opacity-100"
        />
        <div className="" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-[28px] border border-gray-200 bg-white px-6 py-8 shadow-[0_20px_50px_rgba(0,0,0,0.16)] sm:px-8 sm:py-10">
        <div className="flex flex-col items-center text-center">
          <div className="h-30 w-30 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
            <img
              src="/images/City_of_Taguig_logo.png"
              alt="City of Taguig logo"
              className="h-20 w-20 object-contain"
            />
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">
            City of Taguig
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-black">
            CCTV Department
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Inventory and Dispatching System
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Email Address
            </label>
            <div className="flex items-center gap-3 rounded-2xl border-[1.5px] border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 shadow-sm transition focus-within:border-black focus-within:ring-4 focus-within:ring-gray-100">
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
            <div className="flex items-center gap-3 rounded-2xl border-[1.5px] border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 shadow-sm transition focus-within:border-black focus-within:ring-4 focus-within:ring-gray-100">
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
            className="flex w-full items-center justify-center rounded-2xl bg-[#c0392b] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#c0392b]/20 transition hover:bg-[#a93226] focus:outline-none focus:ring-4 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-70"
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
