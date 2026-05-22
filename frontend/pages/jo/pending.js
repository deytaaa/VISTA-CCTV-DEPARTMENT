import JOListPage from '../../components/jo/JOListPage'

export default function PendingJOsPage() {
  return (
    <JOListPage
      title="Pending JOs"
      description="Job Orders waiting for technician acknowledgement or assignment."
      status="pending"
      allowedRoles={['admin', 'supervisor', 'technician']}
    />
  )
}
