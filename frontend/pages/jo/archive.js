import ArchiveListPage from '../../components/jo/ArchiveListPage'

export default function ArchivePage() {
  return (
    <ArchiveListPage
      title="Archived JOs"
      description="Approved and archived records for audit and reference."
      allowedRoles={['admin']}
    />
  )
}
