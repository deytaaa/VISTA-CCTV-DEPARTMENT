import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { loading: authLoading, isAuthenticated } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.replace('/login')
      }, 2000)

      return () => clearTimeout(timer)
    }

    return undefined
  }, [router, success])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess('')

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess('Password changed successfully!')
    setLoading(false)
  }

  return (
    <>
      <Head>
        <title>Reset Password | VISTA CCTV</title>
      </Head>

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
          <div className="w-full max-w-md rounded-[28px] border border-gray-200 bg-white px-6 py-8 shadow-[0_20px_50px_rgba(0,0,0,0.16)] sm:px-8 sm:py-10">
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
                Reset Password
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Create a new password for your VISTA CCTV account.
              </p>
            </div>

            {authLoading ? (
              <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Checking session...
              </div>
            ) : !isAuthenticated ? (
              <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Your reset session is not active. Please open the password reset link again.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    New Password
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border-[1.5px] border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 shadow-sm transition focus-within:border-black focus-within:ring-4 focus-within:ring-gray-100">
                    <span className="text-gray-400 text-lg">*</span>
                    <input
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      type="password"
                      placeholder="Enter new password"
                      className="w-full bg-transparent text-sm text-black outline-none placeholder:text-gray-400"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black">
                    Confirm New Password
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border-[1.5px] border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 shadow-sm transition focus-within:border-black focus-within:ring-4 focus-within:ring-gray-100">
                    <span className="text-gray-400 text-lg">*</span>
                    <input
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      type="password"
                      placeholder="Confirm new password"
                      className="w-full bg-transparent text-sm text-black outline-none placeholder:text-gray-400"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                    {error}
                  </div>
                ) : null}

                {success ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    {success}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-2xl bg-[#c0392b] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#c0392b]/20 transition hover:bg-[#a93226] focus:outline-none focus:ring-4 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Saving...' : 'Save New Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
