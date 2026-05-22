import JOListPage from '../components/jo/JOListPage'

export default function LogsPage() {
  return (
    <JOListPage
      title="Activity Logs"
      description="Audit trail of status changes and user actions."
      allowedRoles={['admin', 'supervisor']}
    />
  )
}
