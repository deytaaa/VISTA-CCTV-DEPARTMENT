import CreateJO from '../create-jo'
import ProtectedRoute from '../../components/ProtectedRoute'

export default function CreateJOPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <CreateJO />
    </ProtectedRoute>
  )
}


