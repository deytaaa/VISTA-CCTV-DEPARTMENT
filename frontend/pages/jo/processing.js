import JOListPage from '../../components/jo/JOListPage'
import ProtectedRoute from '../../components/ProtectedRoute'

export default function ProcessingJOsPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'technician']}>
      <JOListPage
        title="Processing JOs"
        description="Work currently being performed, including items with rejection remarks."
        status="processing"
        allowedRoles={['admin', 'technician']}
      />
    </ProtectedRoute>
  )
}


