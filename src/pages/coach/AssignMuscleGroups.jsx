
import { useEffect, useState } from 'react'
import AppShell from '../../components/AppShell.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getStudentsForCoach } from '../../services/users'
import {
  getMuscleGroups,
  createWorkoutsForStudents,
} from '../../services/workouts'

export default function AssignMuscleGroups() {
  const { user } = useAuth()

  const [students, setStudents] = useState([])
  const [muscleGroups, setMuscleGroups] = useState([])
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [selectedGroups, setSelectedGroups] = useState([])
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!user) return

    Promise.all([
      getStudentsForCoach(user.uid),
      getMuscleGroups(),
    ])
      .then(([studentList, groupList]) => {
        setStudents(
          [...studentList].sort((a, b) =>
            (a.name || '').localeCompare(b.name || '')
          )
        )

        setMuscleGroups(groupList)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  function toggle(setList, value) {
    setList((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()

    setError('')
    setStatus('')

    if (!date) {
      return setError('Pick a date.')
    }

    if (selectedStudentIds.length === 0) {
      return setError('Pick at least one athlete.')
    }

    if (selectedGroups.length === 0) {
      return setError('Pick at least one muscle group.')
    }

    setSaving(true)

    try {
      const chosen = students.filter((student) =>
        selectedStudentIds.includes(student.id)
      )

      await createWorkoutsForStudents({
        coachId: user.uid,
        students: chosen,
        date,
        muscleGroups: selectedGroups,
      })

      setStatus(
        `Workout created for ${chosen
          .map((student) => student.name)
          .join(', ')}.`
      )

      setDate('')
      setSelectedStudentIds([])
      setSelectedGroups([])
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell backTo="/coach/create">
      <h1 className="page-title">Create Workout</h1>

      <p className="page-sub">
        Choose a date, select your athletes,
        and assign muscle groups.
      </p>

      {loading ? (
        <p className="loading">
          Loading athletes and muscle groups…
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <h2 className="section-title">
            Workout Date
          </h2>

          <section className="sheet">
            <div className="field">
              <label htmlFor="workout-date">
                Select Date
              </label>

              <input
                id="workout-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </section>

          <h2 className="section-title">
            Select Athletes
          </h2>

          {students.length === 0 ? (
            <div className="empty">
              <p>
                No athletes available. Create an athlete
                account first.
              </p>
            </div>
          ) : (
            <div className="stack">
              {students.map((student) => (
                <label
                  key={student.id}
                  className="choice choice-row"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(
                      student.id
                    )}
                    onChange={() =>
                      toggle(
                        setSelectedStudentIds,
                        student.id
                      )
                    }
                  />

                  <span>{student.name}</span>
                </label>
              ))}
            </div>
          )}

          <p className="hint">
            {selectedStudentIds.length} athlete(s) selected
          </p>

          <h2 className="section-title">
            Select Muscle Groups
          </h2>

          {muscleGroups.length === 0 ? (
            <div className="empty">
              <p>No muscle groups available.</p>
            </div>
          ) : (
            <div className="chips">
              {muscleGroups.map((group) => (
                <label key={group} className="choice">
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(group)}
                    onChange={() =>
                      toggle(setSelectedGroups, group)
                    }
                  />

                  <span>{group}</span>
                </label>
              ))}
            </div>
          )}

          <p className="hint">
            {selectedGroups.length} muscle group(s) selected
          </p>

          <div className="actionbar">
            {error && (
              <p className="alert" role="alert">
                {error}
              </p>
            )}

            {status && (
              <p className="notice" role="status">
                {status}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={saving}
            >
              {saving
                ? 'Creating Workout…'
                : 'Create Workout'}
            </button>
          </div>
        </form>
      )}
    </AppShell>
  )
}
