import { Link, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../services/firebase'
import { useAuth } from '../context/AuthContext.jsx'
import { getInitials } from '../utils/format'

// The frame around every signed-in screen, laid out like the wireframes:
// avatar top-left, back button top-right.
export default function AppShell({ backTo, children }) {
  const { user, role } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <div className="app">
      <header className="topbar">
        {role === 'coach' ? (
          <Link to="/coach/account" className="avatar" aria-label="Your account">
            {getInitials(user)}
          </Link>
        ) : (
          <span className="avatar" aria-hidden="true">
            {getInitials(user)}
          </span>
        )}

        <span className="brand">Bethel Workout</span>

        {backTo ? (
          <Link to={backTo} className="icon-btn" aria-label="Back">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
        ) : role === 'student' ? (
          <button type="button" className="text-btn" onClick={handleSignOut}>
            Sign out
          </button>
        ) : (
          <span />
        )}
      </header>

      <main className="page">{children}</main>
    </div>
  )
}