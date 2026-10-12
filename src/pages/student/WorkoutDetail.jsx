import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppShell from '../../components/AppShell.jsx'
import EntryGroups from '../../components/EntryGroups.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import VideoLink from '../../components/VideoLink.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { formatDate, formatTime, YOUTUBE_PATTERN } from '../../utils/format'
import {
  getWorkout,
  getExerciseOptions,
  getEntriesForStudent,
  submitWorkout,
} from '../../services/workouts'

export default function WorkoutDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [workout, setWorkout] = useState(null)
  const [options, setOptions] = useState({})
  const [entries, setEntries] = useState([])
  const [picked, setPicked] = useState({})
  const [checkInTime, setCheckInTime] = useState('')
  const [videoLink, setVideoLink] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
          setEntries(await getEntriesForStudent(id, user.uid))
        } else {
          setOptions(await getExerciseOptions(w.muscleGroups))
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id, user])

  function toggleExercise(group, name) {
    const key = `${group}::${name}`
    setPicked((prev) => {
      if (prev[key]) {
        const { [key]: removed, ...rest } = prev
        return rest
      }
      return {
        ...prev,
        [key]: { muscleGroup: group, exerciseName: name, sets: '', reps: '', weight: '' },
      }
    })
  }

  function updateField(key, field, value) {
    setPicked((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const chosen = Object.values(picked)

    if (!checkInTime) return setError('Select the time you were at the gym.')
    if (chosen.length === 0) return setError('Pick at least one exercise.')

    const missing = workout.muscleGroups.filter(
      (g) => !chosen.some((x) => x.muscleGroup === g)
    )
    if (missing.length > 0) {
      return setError(`Pick an exercise for: ${missing.join(', ')}.`)
    }

    if (chosen.some((x) => !x.sets || !x.reps)) {
      return setError('Enter sets and reps for every exercise you picked.')
    }
    if (!YOUTUBE_PATTERN.test(videoLink.trim())) {
      return setError('Paste a valid YouTube link. It should start with https://')
    }

    setSaving(true)
    try {
      await submitWorkout(workout, {
        checkInTime,
        videoLink: videoLink.trim(),
        entries: chosen.map((x) => ({
          muscleGroup: x.muscleGroup,
          exerciseName: x.exerciseName,
          sets: Number(x.sets),
          reps: Number(x.reps),
          weight: x.weight === '' ? null : Number(x.weight),
        })),
      })
      navigate('/workouts')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppShell backTo="/workouts">
        <p className="loading">Loading…</p>
      </AppShell>
    )
  }

  if (!workout) {
    return (
      <AppShell backTo="/workouts">
        <p className="alert" role="alert">
          {error || 'Workout not found.'}
        </p>
      </AppShell>
    )
  }

  // Already submitted: read-only summary
  if (workout.status === 'completed') {
    return (
      <AppShell backTo="/workouts">
        <h1 className="page-title">Workout {formatDate(workout.date)}</h1>
        <div className="page-meta">
          <StatusBadge status="completed" />
          <span>At the gym at {formatTime(workout.checkInTime)}</span>
        </div>

        <div className="stack">
          <EntryGroups muscleGroups={workout.muscleGroups} entries={entries} />
          <VideoLink url={workout.videoLink} label="Watch your video" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell backTo="/workouts">
      <h1 className="page-title">Workout {formatDate(workout.date)}</h1>
      <p className="page-sub">Pick at least one exercise for each muscle group, then log your sets.</p>

      <form onSubmit={handleSubmit} noValidate>
        <section className="sheet">
          <div className="field">
            <label htmlFor="checkin">Time you were at the gym</label>
            <input
              id="checkin"
              type="time"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
            />
          </div>
        </section>

        <h2 className="section-title">Pick your exercises</h2>
        {workout.muscleGroups.map((group) => {
          const count = Object.values(picked).filter((x) => x.muscleGroup === group).length
          return (
            <details key={group} className="group" open>
              <summary>
                <span className="group-name">{group}</span>
                <span className={`count${count > 0 ? ' is-set' : ''}`}>
                  {count > 0 ? `${count} picked` : 'None yet'}
                </span>
              </summary>
              <div className="group-body">
                {(options[group] || []).length === 0 && (
                  <p className="hint">No exercises are set up for this group yet.</p>
                )}
                {(options[group] || []).map((name) => {
                  const key = `${group}::${name}`
                  const p = picked[key]
                  return (
                    <div key={key} className="exercise">
                      <label className="choice choice-row">
                        <input
                          type="checkbox"
                          checked={!!p}
                          onChange={() => toggleExercise(group, name)}
                        />
                        <span>{name}</span>
                      </label>
                      {p && (
                        <div className="metrics">
                          <label>
                            Sets
                            <input
                              type="number"
                              inputMode="numeric"
                              min="1"
                              value={p.sets}
                              onChange={(e) => updateField(key, 'sets', e.target.value)}
                            />
                          </label>
                          <label>
                            Reps
                            <input
                              type="number"
                              inputMode="numeric"
                              min="1"
                              value={p.reps}
                              onChange={(e) => updateField(key, 'reps', e.target.value)}
                            />
                          </label>
                          <label>
                            Weight (lbs)
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="any"
                              value={p.weight}
                              onChange={(e) => updateField(key, 'weight', e.target.value)}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </details>
          )
        })}

        <h2 className="section-title">Your video</h2>
        <section className="sheet">
          <div className="field">
            <label htmlFor="video">YouTube link</label>
            <input
              id="video"
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="https://youtu.be/..."
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
            />
            <p className="hint">Upload it as Unlisted so your coach can open it.</p>
          </div>
        </section>

        <div className="actionbar">
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
            {saving ? 'Submitting…' : 'Submit workout'}
          </button>
        </div>
      </form>
    </AppShell>
  )
}