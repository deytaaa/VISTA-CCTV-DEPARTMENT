import Link from 'next/link'

export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-lightGrayBg px-6 py-12">
      <div className="mx-auto max-w-xl rounded-[24px] border border-gray-200 bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">Access Denied</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-black">You do not have permission to view this page.</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Your account is signed in, but the current role cannot access this section. If you think this is a mistake, contact an administrator.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard" className="rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white">
            Back to Dashboard
          </Link>
          <Link href="/login" className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-black">
            Switch Account
          </Link>
        </div>
      </div>
    </div>
  )
}
