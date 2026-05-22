import Link from 'next/link'
export default function Dashboard() {
  return (
    <div className="min-h-screen bg-lightGrayBg p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">VISTA CCTV — Dashboard</h1>
          <nav>
            <Link href="/create-jo" className="px-3 py-2 bg-taguigRed text-white rounded">Create JO</Link>
          </nav>
        </header>
        <section className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow">Total JOs<br/><strong>—</strong></div>
          <div className="bg-white p-4 rounded shadow">Processing<br/><strong>—</strong></div>
          <div className="bg-white p-4 rounded shadow">For Approval<br/><strong>—</strong></div>
        </section>
      </div>
    </div>
  )
}
