export default function StatCard({ label, value, tone = 'neutral' }) {
  const accentClass =
    tone === 'approved'
      ? 'border-[#A7F3D0] bg-[#D1FAE5] text-[#065F46]'
      : tone === 'good'
        ? 'border-green-200 bg-green-50 text-green-900'
        : tone === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : tone === 'danger'
            ? 'border-red-200 bg-red-50 text-red-900'
            : tone === 'info'
              ? 'border-blue-200 bg-blue-50 text-blue-900'
              : 'border-gray-200 bg-white text-black'

  return (
    <div className={`rounded-[20px] border p-4 shadow-sm ${accentClass}`}>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
    </div>
  )
}
