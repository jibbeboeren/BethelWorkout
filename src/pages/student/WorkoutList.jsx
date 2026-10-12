import { useEffect, useState } from 'react'
import AppShell from '../../components/AppShell.jsx'
import WorkoutRow from '../../components/WorkoutRow.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getWorkoutsForStudent } from '../../services/workouts'

export default function WorkoutList() {
  const { user } = useAuth()
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    getWorkoutsForStudent(user.uid)
      .then(setWorkouts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  const todo = workouts.filter((w) => w.status !== 'completed')
  const done = workouts.filter((w) => w.status === 'completed').reverse()

  return (
    <AppShell>
      <h1 className="page-title">Workouts</h1>
      <p className="page-sub">Open a workout, pick your exercises, and log what you lifted.</p>

      {loading && <p className="loading">Loading…</p>}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && workouts.length === 0 && (
        <div className="empty">
          <p>No workouts yet. When your coach assigns one, it shows up here.</p>
        </div>
      )}

      {todo.length > 0 && (
        <>
          <h2 className="section-title">To do</h2>
          <div className="list">
            {todo.map((w) => (
              <WorkoutRow key={w.id} workout={w} to={`/workouts/${w.id}`} />
            ))}
          </div>
        </>
      )}

      {done.length > 0 && (
        <>
          <h2 className="section-title">Submitted</h2>
          <div className="list">
            {done.map((w) => (
              <WorkoutRow key={w.id} workout={w} to={`/workouts/${w.id}`} />
            ))}
          </div>
        </>
      )}
    </AppShell>
  )
}