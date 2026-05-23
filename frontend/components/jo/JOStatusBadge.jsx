function statusConfig(status, technicianView = false) {
  const normalized = (status || '').toLowerCase()

  if (technicianView && normalized === 'archived') {
    return { label: 'Archived', className: 'bg-[#F3F4F6] text-[#6B7280] border-[#D1D5DB]' }
  }

  switch (normalized) {
    case 'draft':
      return { label: 'Draft', className: 'bg-[#F3F4F6] text-[#374151] border-[#D1D5DB]' }
    case 'sent':
      return { label: 'Sent', className: 'bg-[#DBEAFE] text-[#1D4ED8] border-[#93C5FD]' }
    case 'processing':
      return { label: 'Processing', className: 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]' }
    case 'for_approval':
      return { label: 'For Approval', className: 'bg-[#FFF7ED] text-[#EA580C] border-[#FDBA74]' }
    case 'approved':
      return { label: 'Approved', className: 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]' }
    case 'rejected':
      return { label: 'Rejected', className: 'bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]' }
    case 'archived':
      return { label: 'Archived', className: 'bg-[#F3F4F6] text-[#6B7280] border-[#D1D5DB]' }
    case 'pending':
      return { label: 'Pending', className: 'bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]' }
    case 'completed':
      return { label: 'Completed', className: 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]' }
    default:
      return { label: (status || 'draft').replace(/_/g, ' '), className: 'bg-[#F3F4F6] text-[#374151] border-[#D1D5DB]' }
  }
}

export default function JOStatusBadge({ status, className = '', technicianView = false }) {
  const config = statusConfig(status, technicianView)
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${config.className} ${className}`}>{config.label}</span>
}
