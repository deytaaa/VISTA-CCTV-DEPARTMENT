import AdminDashboard from '../components/dashboard/AdminDashboard'
import TechnicianDashboard from '../components/dashboard/TechnicianDashboard'
import InventoryDashboard from '../components/dashboard/InventoryDashboard'
import { useAuth } from '../context/AuthContext'

export default function DashboardPage() {
  const { loading, role } = useAuth()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">Checking session...</div>
  }

  if (role === 'technician') return <TechnicianDashboard />
  if (role === 'inventory') return <InventoryDashboard />
  return <AdminDashboard />
}
