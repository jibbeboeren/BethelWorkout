
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppShell from '../../components/AppShell.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getStudent } from '../../services/users'
import { getWorkoutsForCoachStudent } from '../../services/workouts'
import { formatDate } from '../../utils/format'

export default function AthleteWorkouts() {
  const { id } = useParams()
  const { user } = useAuth()

  const [student, setStudent] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return

    Promise.all([
      getStudent(id),
      getWorkoutsForCoachStudent(user.uid, id),
    ])
      .then(([studentData, workoutData]) => {
        setStudent(studentData)
        setWorkouts(workoutData)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, user])

  const pending = workouts.filter(
    (w) => w.status !== 'completed'
  )

  const completed = workouts
    .filter((w) => w.status === 'completed')
    .reverse()

  function renderWorkout(workout) {
    return (
      <Link
        key={workout.id}
        to={`/coach/review/${workout.id}`}
        className="row"
      >
        <div className="row-body">
          <span className="row-title">
            Workout {formatDate(workout.date)}
          </span>

          <span className="row-sub">
            {workout.muscleGroups?.join(', ')}
          </span>
        </div>

        <StatusBadge status={workout.status} />
      </Link>
    )
  }

  return (
    <AppShell backTo="/coach/create">
      <h1 className="page-title">
        {student?.name || 'Athlete'}
      </h1>

      <p className="page-sub">
        View assigned workouts and completed sessions.
      </p>

      {loading && (
        <p className="loading">Loading workouts…</p>
      )}

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && workouts.length === 0 && (
        <div className="empty">
          <p>No workouts assigned yet.</p>
        </div>
      )}

      {!loading && !error && pending.length > 0 && (
        <>
          <h2 className="section-title">To Do</h2>

          <div className="list">
            {pending.map(renderWorkout)}
          </div>
        </>
      )}

      {!loading && !error && completed.length > 0 && (
        <>
          <h2 className="section-title">Submitted</h2>

          <div className="list">
            {completed.map(renderWorkout)}
          </div>
        </>
      )}
    </AppShell>
  )
}
