import JOListPage from '../../components/jo/JOListPage'

export default function ArchivePage() {
  return (
    <JOListPage
      title="Archived JOs"
      description="Approved and archived records for audit and reference."
      status="archived"
      allowedRoles={['admin', 'supervisor']}
    />
  )
}
