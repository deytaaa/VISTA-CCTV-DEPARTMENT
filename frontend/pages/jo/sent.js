import JOListPage from '../../components/jo/JOListPage'
import ProtectedRoute from '../../components/ProtectedRoute'

export default function SentJOsPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'technician']}>
      <JOListPage
        title="Sent JOs"
        description="Job Orders dispatched from the requesting office."
        status="sent"
        allowedRoles={['admin', 'technician']}
      />
    </ProtectedRoute>
  )
}


