import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

function buildFallbackProfile(nextSession, payload = {}) {
  const sessionUser = nextSession?.user || null
  const authUser = payload?.authUser || null
  const mergedUser = payload?.user || null

  const role = mergedUser?.role || payload?.profile?.role || null

  return {
    ...(payload?.profile || {}),
    ...(mergedUser || {}),
    id: mergedUser?.id || payload?.profile?.id || authUser?.id || sessionUser?.id || null,
    email: mergedUser?.email || payload?.profile?.email || authUser?.email || sessionUser?.email || null,
    name:
      mergedUser?.name ||
      payload?.profile?.name ||
      sessionUser?.user_metadata?.name ||
      authUser?.user_metadata?.name ||
      authUser?.email ||
      sessionUser?.email ||
      null,
    role,
  }
}

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

      let payload = null
      try {
        payload = await response.json()
      } catch (parseError) {
        payload = null
      }

      if (!response.ok) {
        setProfile(buildFallbackProfile(nextSession, payload))
        setLoading(false)
        return
      }

      setProfile(buildFallbackProfile(nextSession, payload))
    } catch (error) {
      console.error('Failed to sync backend session', error)
      setProfile(buildFallbackProfile(nextSession))
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
      if (!nextSession?.access_token) {
        setSession(null)
        setProfile(null)
        setLoading(false)
        return
      }

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
      role: profile?.role ?? null,
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
