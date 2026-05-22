import JOListPage from '../../components/jo/JOListPage'

export default function ProcessingJOsPage() {
  return (
    <JOListPage
      title="Processing JOs"
      description="Work currently being performed, including items with rejection remarks."
      status="processing"
      allowedRoles={['admin', 'supervisor', 'technician']}
    />
  )
}
