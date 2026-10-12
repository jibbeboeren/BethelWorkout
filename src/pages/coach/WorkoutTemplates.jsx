
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell from '../../components/AppShell.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  getWorkoutTemplates,
  deleteWorkoutTemplate,
} from '../../services/workoutTemplates'

export default function WorkoutTemplates() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return

    getWorkoutTemplates(user.uid)
      .then(setTemplates)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  async function handleDelete(template) {
    const confirmed = window.confirm(
      `Delete "${template.name}"? Assigned workouts will not be affected.`
    )

    if (!confirmed) return

    setDeleting(template.id)
    setError('')

    try {
      await deleteWorkoutTemplate(template.id, user.uid)
      setTemplates((current) =>
        current.filter((item) => item.id !== template.id)
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting('')
    }
  }

  return (
    <AppShell backTo="/coach/create">
      <h1 className="page-title">My Templates</h1>
      <p className="page-sub">
        Save your favorite workouts and assign them again.
      </p>

      <Link
        to="/coach/assign"
        className="btn btn-primary btn-block"
      >
        Create New Workout
      </Link>

      <h2 className="section-title">Saved Workouts</h2>

      {loading && (
        <p className="loading">Loading templates…</p>
      )}

      {error && (
        <p className="alert" role="alert">{error}</p>
      )}

      {!loading && templates.length === 0 && (
        <div className="empty">
          <p>No saved templates yet.</p>
          <p>Save a workout from the Create Workout page.</p>
        </div>
      )}

      <div className="stack">
        {templates.map((template) => {
          const exerciseCount = Object.values(
            template.assignedExercises || {}
          ).reduce((total, exercises) => total + exercises.length, 0)

          return (
            <section className="sheet" key={template.id}>
              <h2 className="row-title">{template.name}</h2>

              <p className="row-sub">
                {(template.muscleGroups || []).join(' · ')}
              </p>

              <p className="hint">
                {template.exerciseSelectionMode === 'coach'
                  ? `${exerciseCount} prescribed exercise(s)`
                  : "Student's choice"}
              </p>

              <div
                className="stack"
                style={{ gap: '8px', marginTop: '16px' }}
              >
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() =>
                    navigate(`/coach/assign?template=${template.id}`)
                  }
                >
                  Use Template
                </button>

                <button
                  type="button"
                  className="btn btn-plain btn-block"
                  onClick={() =>
                    navigate(`/coach/assign?editTemplate=${template.id}`)
                  }
                >
                  Edit Template
                </button>

                <button
                  type="button"
                  className="btn btn-plain btn-block"
                  disabled={deleting === template.id}
                  onClick={() => handleDelete(template)}
                >
                  {deleting === template.id
                    ? 'Deleting…'
                    : 'Delete Template'}
                </button>
              </div>
            </section>
          )
        })}
      </div>
    </AppShell>
  )
}
