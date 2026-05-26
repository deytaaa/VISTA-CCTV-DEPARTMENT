import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function syncBackendSession(nextSession) {
    setLoading(true)
    setSession(nextSession)
    setProfile(null)

    if (!nextSession?.access_token) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
        headers: {
          Authorization: `Bearer ${nextSession.access_token}`,
        },
      })

      if (!response.ok) {
        setProfile(null)
        setLoading(false)
        return
      }

      const data = await response.json()
      setProfile(data?.profile ?? null)
    } catch (error) {
      console.error('Failed to sync backend session', error)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error) {
        console.error('Failed to load auth session', error)
      }

      await syncBackendSession(data?.session ?? null)
      setLoading(false)
    }

    loadSession()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      syncBackendSession(nextSession)
    })

    return () => {
      mounted = false
      subscription?.subscription?.unsubscribe?.()
    }
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role: profile?.role ?? session?.user?.user_metadata?.role ?? session?.user?.app_metadata?.role ?? null,
      loading,
      isAuthenticated: Boolean(session),
    }),
    [loading, profile, session]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
