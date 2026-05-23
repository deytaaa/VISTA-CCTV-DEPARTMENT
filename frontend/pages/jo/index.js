import JOListPage from '../../components/jo/JOListPage'
import { useAuth } from '../../context/AuthContext'

export default function JobOrdersPage() {
  const { loading, role } = useAuth()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">Checking session...</div>
  }

  if (role === 'technician') {
    return (
      <JOListPage
        title="My Job Orders"
        description="Assigned job orders for the logged-in technician."
        viewMode="technician"
        emptyTitle="No assigned job orders found."
        emptyDescription="Assigned Job Orders will appear here."
      />
    )
  }

  return <JOListPage title="Job Orders" description="Browse and filter job orders across all statuses." />
}