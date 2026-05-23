import JOListPage from '../../components/jo/JOListPage'

export default function SentJOsPage() {
  return (
    <JOListPage
      title="Sent JOs"
      description="Job Orders dispatched from the requesting office."
      status="sent"
      allowedRoles={['admin', 'technician']}
    />
  )
}
