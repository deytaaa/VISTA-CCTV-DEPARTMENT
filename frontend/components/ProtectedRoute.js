import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles = null, redirectTo = '/access-denied' }) {
  const router = useRouter()
  const { loading, isAuthenticated, role } = useAuth()
  const hasRoleAccess = !Array.isArray(allowedRoles) || allowedRoles.length === 0 || allowedRoles.includes(role)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(router.asPath)}`)
      return
    }

    if (!loading && isAuthenticated && !hasRoleAccess) {
      router.replace(`${redirectTo}?next=${encodeURIComponent(router.asPath)}`)
    }
  }, [hasRoleAccess, isAuthenticated, loading, redirectTo, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">
        Checking session...
      </div>
    )
  }

  if (!isAuthenticated || !hasRoleAccess) {
    return null
  }

  return children
}
