import AdminDashboard from '../components/dashboard/AdminDashboard'
import TechnicianDashboard from '../components/dashboard/TechnicianDashboard'
import { useAuth } from '../context/AuthContext'

export default function DashboardPage() {
  const { loading, role } = useAuth()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">Checking session...</div>
  }

  return role === 'technician' ? <TechnicianDashboard /> : <AdminDashboard />
}
