
import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import AppShell from '../../components/AppShell.jsx'
import { auth } from '../../services/firebase'
import { createStudentAccount } from '../../services/functions'
import { useAuth } from '../../context/AuthContext.jsx'

export default function Account() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setError('')
    setSigningOut(true)

    try {
      await signOut(auth)
      navigate('/login')
    } catch (err) {
      setError(err.message)
      setSigningOut(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    setStatus('')

    if (!name.trim()) {
      return setError('Enter the athlete name.')
    }

    if (!email.trim()) {
      return setError('Enter an email address.')
    }

    if (!password) {
      return setError('Enter a password.')
    }

    setSaving(true)

    try {
      await createStudentAccount({
        name: name.trim(),
        email: email.trim(),
        password,
      })

      setStatus(`Athlete account created for ${name.trim()}.`)
      setName('')
      setEmail('')
      setPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell backTo="/coach/create">
      <h1 className="page-title">Account</h1>
      <p className="page-sub">
        Manage your coach account and create accounts
        for your athletes.
      </p>

      <h2 className="section-title">Your Account</h2>

      <section className="sheet">
        <div className="field">
          <label>Account Name</label>
          <p>
            <strong>
              {user?.displayName || user?.email || 'Coach'}
            </strong>
          </p>
        </div>

        {user?.displayName && user?.email && (
          <div className="field">
            <label>Email Address</label>
            <p>{user.email}</p>
          </div>
        )}
      </section>

      <h2 className="section-title">
        Create Athlete Account
      </h2>

      <p className="page-sub">
        Create a new account so an athlete can
        receive and submit assigned workouts.
      </p>

      <form onSubmit={handleCreate} noValidate>
        <section className="sheet">
          <div className="field">
            <label htmlFor="athlete-name">
              Athlete Name
            </label>
            <input
              id="athlete-name"
              type="text"
              placeholder="Enter athlete name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="athlete-email">
              Email Address
            </label>
            <input
              id="athlete-email"
              type="email"
              placeholder="athlete@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="athlete-password">
              Temporary Password
            </label>
            <input
              id="athlete-password"
              type="password"
              placeholder="Enter temporary password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <p className="hint">
              Use a unique temporary password and
              share it securely with the athlete.
            </p>
          </div>
        </section>

        <div className="actionbar">
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          {status && (
            <p className="hint" role="status">
              {status}
            </p>
          )}

          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={saving}
          >
            {saving ? 'Creating Account…' : 'Create Athlete Account'}
          </button>
        </div>
      </form>

      <h2 className="section-title">Session</h2>

      <section className="sheet">
        <p className="hint">
          Sign out of your coach account.
        </p>

        <button
          className="btn btn-block"
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? 'Signing Out…' : 'Sign Out'}
        </button>
      </section>
    </AppShell>
  )
}
