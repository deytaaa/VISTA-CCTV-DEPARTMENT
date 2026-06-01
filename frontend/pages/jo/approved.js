import JOListPage from '../../components/jo/JOListPage'
import ProtectedRoute from '../../components/ProtectedRoute'

export default function ApprovedJOsPage() {
  return (
    <ProtectedRoute allowedRoles={['technician']}>
      <JOListPage
        title="Approved JOs"
        description="Your approved job orders."
        status="approved"
        viewMode="technician"
        receiverId={null}
        statusIn="approved"
        showStatusFilter={false}
        lockedStatus="approved"
        filterLayout="approved"
        allowedRoles={['technician']}
        emptyTitle="No approved job orders yet."
        emptyDescription="Approved job orders assigned to you will appear here."
      />
    </ProtectedRoute>
  )
}


