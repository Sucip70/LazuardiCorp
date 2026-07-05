import { type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../../api/auth'
import { useCurrentUser } from '../../hooks/useCurrentUser'

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate()
  const { user } = useCurrentUser()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              L
            </span>
            <span className="hidden sm:inline">Lazuardi</span>
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/"
              className="rounded-md px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              Home
            </Link>
            <Link
              to="/templates"
              className="rounded-md px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              Templates
            </Link>
          </nav>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {user && (
              <span className="hidden text-sm text-gray-500 sm:inline">{user.name}</span>
            )}
            <Link
              to="/account"
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Account
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  )
}
