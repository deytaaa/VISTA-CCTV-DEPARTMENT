import JOListPage from '../../components/jo/JOListPage'
import ProtectedRoute from '../../components/ProtectedRoute'

export default function PendingJOsPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'technician']}>
      <JOListPage
        title="Pending JOs"
        description="Job Orders waiting for technician acknowledgement or assignment."
        status="pending"
        allowedRoles={['admin', 'technician']}
      />
    </ProtectedRoute>
  )
}

