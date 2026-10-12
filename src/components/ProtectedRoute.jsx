import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Wrap a set of routes with <ProtectedRoute role="coach" /> or role="student"
// to restrict access. See AppRouter.jsx for usage.
export default function ProtectedRoute({ role }) {
  const { user, role: userRole, loading } = useAuth()

  if (loading) {
    return (
      <div className="app">
        <p className="loading page">Loading…</p>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (role && userRole !== role) return <Navigate to="/login" replace />

  return <Outlet />
}