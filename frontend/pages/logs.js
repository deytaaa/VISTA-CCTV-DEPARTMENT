import ActivityLogsPage from '../components/logs/ActivityLogsPage'

export default function LogsPage() {
  return (
    <ActivityLogsPage
      title="Activity Logs"
      description="Audit trail of every action performed in the system."
      allowedRoles={['admin']}
    />
  )
}
