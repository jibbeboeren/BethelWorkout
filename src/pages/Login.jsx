
import { useState } from 'react'
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth'
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
      return err.message || 'Something went wrong. Please try again.'
  }
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setBusy(true)

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      )
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

  async function handlePasswordReset(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setBusy(true)

    try {
      await sendPasswordResetEmail(auth, email.trim())

      setSuccess(
        'If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.'
      )
    } catch (err) {
      if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.')
      } else if (err.code === 'auth/network-request-failed') {
        setError("Can't reach the server. Check your connection and try again.")
      } else {
        setError('Unable to send a reset email right now. Please try again later.')
      }
    } finally {
      setBusy(false)
    }
  }

  function switchMode() {
    setResetMode(!resetMode)
    setError('')
    setSuccess('')
  }

  return (
    <div className="login">
      <div>
        <h1 className="wordmark">
          Bethel
          <br />
          Workout
        </h1>
        <p className="login-intro">
          Your coach sets the plan. You pick the exercises and log your lifts.
        </p>
      </div>

      <form
        className="sheet"
        onSubmit={resetMode ? handlePasswordReset : handleLogin}
      >
        <h2 className="login-title">
          {resetMode ? 'Reset password' : 'Log in'}
        </h2>

        {resetMode && (
          <p>
            Enter your account email and we'll send you a link to
            create a new password.
          </p>
        )}

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

        {!resetMode && (
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
        )}

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p role="status" aria-live="polite">
            {success}
          </p>
        )}

        <button
          className="btn btn-primary btn-block"
          type="submit"
          disabled={busy}
        >
          {busy
            ? 'Please wait…'
            : resetMode
              ? 'Send reset email'
              : 'Log in'}
        </button>

        <button
          type="button"
          onClick={switchMode}
          disabled={busy}
          style={{
            display: 'block',
            margin: '16px auto 0',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
            color: 'inherit',
            font: 'inherit',
          }}
        >
          {resetMode ? 'Back to login' : 'Forgot password?'}
        </button>
      </form>
    </div>
  )
}
