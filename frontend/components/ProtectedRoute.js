import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const router = useRouter()
  const { loading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(router.asPath)}`)
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">
        Checking session...
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return children
}
