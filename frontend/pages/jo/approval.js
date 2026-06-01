import ApprovalQueuePageView from '../../components/jo/ApprovalQueuePage'
import ProtectedRoute from '../../components/ProtectedRoute'

export default function ApprovalQueueRoute() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <ApprovalQueuePageView />
    </ProtectedRoute>
  )
}


