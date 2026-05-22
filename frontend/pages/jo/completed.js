import JOListPage from '../../components/jo/JOListPage'

export default function CompletedJOsPage() {
  return (
    <JOListPage
      title="Completed JOs"
      description="Completed work awaiting admin approval."
      status="completed"
      allowedRoles={['admin', 'supervisor', 'technician']}
    />
  )
}
