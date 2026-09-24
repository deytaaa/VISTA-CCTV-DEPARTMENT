import JOListPage from '../../components/jo/JOListPage'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../context/AuthContext'

export default function PendingJOsPage() {
  const { loading, role } = useAuth()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">Checking session...</div>
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'technician']}>
      <JOListPage
        title="Pending JOs"
        description="Job Orders waiting for technician acknowledgement or assignment."
        status="pending"
        viewMode={role === 'technician' ? 'technician' : 'admin'}
        allowedRoles={['admin', 'technician']}
      />
    </ProtectedRoute>
  )
}

