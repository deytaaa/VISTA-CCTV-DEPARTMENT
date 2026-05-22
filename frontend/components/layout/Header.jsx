import { useAuth } from '../../context/AuthContext'
import NotificationDropdown from '../shared/NotificationDropdown'

export default function Header({ title, subtitle, actions = null }) {
  const { user, role } = useAuth()

  return (
    <header className="flex w-full flex-col gap-4 border-b border-gray-200 bg-white px-6 py-4 text-black md:flex-row md:items-center md:justify-between lg:px-8">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">{subtitle || 'VISTA CCTV Department'}</p>
        <h1 className="text-2xl font-black tracking-tight text-black">{title}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3 md:ml-auto">
        <div className="text-right">
          <p className="text-sm font-semibold text-black">{user?.email || 'User'}</p>
          <p className="text-xs uppercase tracking-[0.25em] text-gray-500">{role || 'No role'}</p>
        </div>
        <NotificationDropdown />
        {actions}
      </div>
    </header>
  )
}
