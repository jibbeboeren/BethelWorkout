
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../../components/AppShell.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getStudentsForCoach } from '../../services/users'
import { subscribeToCoachWorkouts } from '../../services/workouts'
import { formatDate } from '../../utils/format'

// Format today's date using the coach's local timezone.
function getToday() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDaysOverdue(date, today) {
  const start = Date.parse(`${date}T00:00:00Z`)
  const end = Date.parse(`${today}T00:00:00Z`)

  return Math.round((end - start) / 86400000)
}

export default function CreateWorkout() {
  const { user } = useAuth()

  const [students, setStudents] = useState([])
  const [workouts, setWorkouts] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadingWorkouts, setLoadingWorkouts] = useState(true)
  const [studentError, setStudentError] = useState('')
  const [workoutError, setWorkoutError] = useState('')
  const [showAllAlerts, setShowAllAlerts] = useState(false)
  const [today, setToday] = useState(getToday)

  useEffect(() => {
    if (!user) return

    let active = true

    setLoadingStudents(true)
    setStudentError('')

    getStudentsForCoach(user.uid)
      .then((list) => {
        if (!active) return

        setStudents(
          [...list].sort((a, b) =>
            (a.name || '').localeCompare(b.name || '')
          )
        )
      })
      .catch((err) => {
        if (active) setStudentError(err.message)
      })
      .finally(() => {
        if (active) setLoadingStudents(false)
      })

    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    if (!user) return

    setLoadingWorkouts(true)
    setWorkoutError('')

    const unsubscribe = subscribeToCoachWorkouts(
      user.uid,
      (list) => {
        setWorkouts(list)
        setLoadingWorkouts(false)
      },
      (err) => {
        setWorkoutError(err.message)
        setLoadingWorkouts(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  // Update the date if the dashboard remains open overnight.
  useEffect(() => {
    const interval = setInterval(() => {
      const current = getToday()
      setToday((previous) =>
        previous === current ? previous : current
      )
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const alerts = workouts
    .filter(
      (workout) =>
        workout.status !== 'completed' &&
        typeof workout.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(workout.date) &&
        workout.date <= today
    )
    .map((workout) => ({
      ...workout,
      daysOverdue: getDaysOverdue(workout.date, today),
    }))
    .sort((a, b) => {
      // Most overdue workouts appear first.
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date)
      }

      return (a.studentName || '').localeCompare(
        b.studentName || ''
      )
    })

  const overdueCount = alerts.filter(
    (workout) => workout.daysOverdue > 0
  ).length

  const dueTodayCount = alerts.filter(
    (workout) => workout.daysOverdue === 0
  ).length

  const visibleAlerts = showAllAlerts
    ? alerts
    : alerts.slice(0, 5)

  return (
    <AppShell>
      <h1 className="page-title">Athletes</h1>

      <p className="page-sub">
        Manage your athletes, assign workouts, and monitor
        missing submissions.
      </p>

      <Link
        to="/coach/assign"
        className="btn btn-primary btn-block"
      >
        Create Workout
      </Link>

      <Link
        to="/coach/templates"
        className="btn btn-plain btn-block"
        style={{ marginTop: '10px' }}
      >
        Workout Templates
      </Link>

      <h2 className="section-title">
        Workout Alerts
      </h2>

      {loadingWorkouts && (
        <p className="loading">
          Checking workout submissions…
        </p>
      )}

      {workoutError && (
        <p className="alert" role="alert">
          {workoutError}
        </p>
      )}

      {!loadingWorkouts && !workoutError && (
        <>
          {alerts.length === 0 ? (
            <section className="sheet">
              <p style={{ margin: 0 }}>
                No missing workout submissions.
              </p>
              <p className="hint" style={{ marginBottom: 0 }}>
                All workouts due today or earlier have
                been completed.
              </p>
            </section>
          ) : (
            <>
              <section
                className="sheet"
                style={{ marginBottom: '12px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <strong>
                    {alerts.length} workout
                    {alerts.length === 1 ? '' : 's'} need attention
                  </strong>

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {overdueCount > 0 && (
                      <span
                        style={{
                          color: '#991b1b',
                          background: '#fee2e2',
                          borderRadius: '999px',
                          padding: '5px 10px',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {overdueCount} overdue
                      </span>
                    )}

                    {dueTodayCount > 0 && (
                      <span
                        style={{
                          color: '#92400e',
                          background: '#fef3c7',
                          borderRadius: '999px',
                          padding: '5px 10px',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {dueTodayCount} due today
                      </span>
                    )}
                  </div>
                </div>
              </section>

              <div
                className="list"
                style={{ marginBottom: '12px' }}
              >
                {visibleAlerts.map((workout) => {
                  const isOverdue = workout.daysOverdue > 0

                  const label = isOverdue
                    ? `${workout.daysOverdue} day${
                        workout.daysOverdue === 1 ? '' : 's'
                      } late`
                    : 'Due today'

                  return (
                    <Link
                      key={workout.id}
                      to={`/coach/review/${workout.id}`}
                      className="row"
                      style={{
                        borderLeft: `4px solid ${
                          isOverdue ? '#dc2626' : '#d97706'
                        }`,
                      }}
                    >
                      <div className="row-body">
                        <span className="row-title">
                          {workout.studentName || 'Athlete'}
                        </span>

                        <span className="row-sub">
                          {(workout.muscleGroups || []).join(', ')}
                        </span>

                        <span className="row-sub">
                          Workout: {formatDate(workout.date)}
                        </span>
                      </div>

                      <span
                        style={{
                          flexShrink: 0,
                          alignSelf: 'center',
                          color: isOverdue
                            ? '#991b1b'
                            : '#92400e',
                          background: isOverdue
                            ? '#fee2e2'
                            : '#fef3c7',
                          borderRadius: '999px',
                          padding: '6px 10px',
                          fontSize: '12px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {label}
                      </span>
                    </Link>
                  )
                })}
              </div>

              {alerts.length > 5 && (
                <button
                  type="button"
                  className="btn btn-plain btn-block"
                  onClick={() =>
                    setShowAllAlerts((current) => !current)
                  }
                >
                  {showAllAlerts
                    ? 'Show Fewer Alerts'
                    : `View All ${alerts.length} Alerts`}
                </button>
              )}
            </>
          )}
        </>
      )}

      <h2 className="section-title">Your Athletes</h2>

      {loadingStudents && (
        <p className="loading">Loading athletes…</p>
      )}

      {studentError && (
        <p className="alert" role="alert">
          {studentError}
        </p>
      )}

      {!loadingStudents &&
        !studentError &&
        students.length === 0 && (
          <div className="empty">
            <p>
              No athletes yet. You can create athlete
              accounts from your Account page.
            </p>
          </div>
        )}

      {!loadingStudents &&
        !studentError &&
        students.length > 0 && (
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
