
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../../components/AppShell.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getStudentsForCoach } from '../../services/users'

export default function CreateWorkout() {
  const { user } = useAuth()

  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return

    getStudentsForCoach(user.uid)
      .then((list) =>
        setStudents(
          [...list].sort((a, b) =>
            (a.name || '').localeCompare(b.name || '')
          )
        )
      )
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  return (
    <AppShell>
      <h1 className="page-title">Athletes</h1>

      <p className="page-sub">
        Manage your athletes and assign new workouts.
      </p>

      <Link
        to="/coach/assign"
        className="btn btn-primary btn-block"
      >
        Create Workout
      </Link>

      <h2 className="section-title">Your Athletes</h2>

      {loading && (
        <p className="loading">Loading athletes…</p>
      )}

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && students.length === 0 && (
        <div className="empty">
          <p>
            No athletes yet. You can create athlete
            accounts from your Account page.
          </p>
        </div>
      )}

      {!loading && !error && students.length > 0 && (
        <div className="list">
          {students.map((student) => (
            <Link
              key={student.id}
              to={`/coach/athlete/${student.id}`}
              className="row"
            >
              <div className="row-body">
                <span className="row-title">
                  {student.name}
                </span>

                <span className="row-sub">
                  View workouts
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  )
}
