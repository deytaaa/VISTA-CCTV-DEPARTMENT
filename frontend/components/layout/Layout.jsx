import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout({ children, title, subtitle, actions }) {
  return (
    <div className="flex min-h-screen bg-lightGrayBg">
      <Sidebar />
      <main className="min-w-0 flex-1 bg-lightGrayBg">
        <Header title={title} subtitle={subtitle} actions={actions} />
        <div className="px-6 py-6 lg:px-8">{children}</div>
      </main>
    </div>
  )
}
