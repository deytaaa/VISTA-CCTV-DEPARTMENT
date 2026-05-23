import Sidebar from './Sidebar'
import Header from './Header'
import { useEffect, useState } from 'react'

export default function Layout({ children, title, subtitle, actions }) {
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      const s = localStorage.getItem('sidebarHidden')
      setSidebarHidden(s === 'true')
    } catch (e) {
      setSidebarHidden(false)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('sidebarHidden', String(sidebarHidden))
    } catch (e) {}
  }, [sidebarHidden])

  return (
    <div className="min-h-screen bg-lightGrayBg">
      <Sidebar hidden={sidebarHidden} setHidden={setSidebarHidden} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main className={`min-w-0 bg-lightGrayBg transition-[margin-left] duration-300 ${sidebarHidden ? 'md:ml-0' : 'md:ml-72'}`}>
        <Header title={title} subtitle={subtitle} actions={actions} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} sidebarHidden={sidebarHidden} setSidebarHidden={setSidebarHidden} />
        <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">{children}</div>
      </main>
    </div>
  )
}
