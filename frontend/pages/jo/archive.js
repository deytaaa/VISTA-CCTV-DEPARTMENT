import ArchiveListPage from '../../components/jo/ArchiveListPage'
import ProtectedRoute from '../../components/ProtectedRoute'

export default function ArchivePage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <ArchiveListPage
        title="Archived JOs"
        description="Approved and archived records for audit and reference."
        allowedRoles={['admin']}
      />
    </ProtectedRoute>
  )
}


