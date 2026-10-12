import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '../services/firebase'

function friendlyError(err) {
  switch (err.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return "That email or password isn't right. Check both and try again."
    case 'auth/invalid-email':
      return 'Enter a full email address, like name@school.edu.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes, then try again.'
    case 'auth/network-request-failed':
      return "Can't reach the server. Check your connection and try again."
    default:
      return err.message
  }
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const tokenResult = await userCredential.user.getIdTokenResult()
      const role = tokenResult.claims.role

      if (role === 'coach') {
        navigate('/coach/create')
      } else if (role === 'student') {
        navigate('/workouts')
      } else {
        setError('This account has no role yet. Ask your coach to set it up.')
      }
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <div>
        <h1 className="wordmark">
          Bethel
          <br />
          Workout
        </h1>
        <p className="login-intro">Your coach sets the plan. You pick the exercises and log your lifts.</p>
      </div>

      <form className="sheet" onSubmit={handleLogin}>
        <h2 className="login-title">Log in</h2>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  )
}