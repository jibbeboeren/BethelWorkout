
import { useEffect, useState } from 'react'
import AppShell from '../../components/AppShell.jsx'
import EntryGroups from '../../components/EntryGroups.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import VideoLink from '../../components/VideoLink.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  getWorkout,
  getEntriesForCoach,
} from '../../services/workouts'
import { formatDate, formatTime } from '../../utils/format'
import { useParams } from 'react-router-dom'

export default function WorkoutReview() {
  const { id } = useParams()
  const { user } = useAuth()

  const [workout, setWorkout] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return

    async function load() {
      try {
        const w = await getWorkout(id)

        if (!w) {
          setError('Workout not found.')
          return
        }

        setWorkout(w)

        if (w.status === 'completed') {
          setEntries(await getEntriesForCoach(id, user.uid))
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id, user])

  const backTo = workout?.studentId
    ? `/coach/athlete/${workout.studentId}`
    : '/coach/create'

  if (loading) {
    return (
      <AppShell backTo={backTo}>
        <p className="loading">Loading…</p>
      </AppShell>
    )
  }

  if (!workout) {
    return (
      <AppShell backTo={backTo}>
        <p className="alert" role="alert">
          {error || 'Workout not found.'}
        </p>
      </AppShell>
    )
  }

  return (
    <AppShell backTo={backTo}>
      <h1 className="page-title">
        {workout.studentName}
      </h1>

      <p className="page-sub">
        Workout {formatDate(workout.date)}
      </p>

      <div className="page-meta">
        <StatusBadge status={workout.status} />

        {workout.status === 'completed' && (
          <span>
            At the gym at {formatTime(workout.checkInTime)}
          </span>
        )}
      </div>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {workout.status !== 'completed' ? (
        <>
          <h2 className="section-title">
            Assigned Muscle Groups
          </h2>

          <section className="sheet">
            <p className="hint">
              This workout has not been submitted yet.
            </p>

            <div className="stack">
              {workout.muscleGroups.map((group) => (
                <div key={group} className="exercise">
                  <strong>{group}</strong>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="stack">
          <h2 className="section-title">
            Completed Exercises
          </h2>

          <EntryGroups
            muscleGroups={workout.muscleGroups}
            entries={entries}
          />

          <h2 className="section-title">
            Workout Video
          </h2>

          <VideoLink
            url={workout.videoLink}
            label="Watch athlete's video"
          />
        </div>
      )}
    </AppShell>
  )
}
