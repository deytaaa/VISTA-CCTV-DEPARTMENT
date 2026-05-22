import JOListPage from '../../components/jo/JOListPage'

export default function ApprovalQueuePage() {
  return (
    <JOListPage
      title="Approval Queue"
      description="Completed JOs waiting for admin review and approval."
      status="for_approval"
      allowedRoles={['admin', 'supervisor']}
    />
  )
}
