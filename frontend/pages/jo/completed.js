import JOListPage from '../../components/jo/JOListPage'
import ProtectedRoute from '../../components/ProtectedRoute'

export default function CompletedJOsPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'technician']}>
      <JOListPage
        title="Completed JOs"
        description="Completed work awaiting admin approval."
        status="completed"
        allowedRoles={['admin', 'technician']}
      />
    </ProtectedRoute>
  )
}

