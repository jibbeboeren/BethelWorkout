
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppShell from '../../components/AppShell.jsx'
import EntryGroups from '../../components/EntryGroups.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import VideoLink from '../../components/VideoLink.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  formatDate,
  formatTime,
  YOUTUBE_PATTERN,
} from '../../utils/format'
import {
  getWorkout,
  getExerciseOptions,
  getEntriesForStudent,
  submitWorkout,
} from '../../services/workouts'

function exerciseKey(group, name) {
  return JSON.stringify([group, name])
}

function minimumDescription(exercise) {
  const parts = []

  if (exercise.minSets != null) {
    parts.push(`${exercise.minSets} sets`)
  }

  if (exercise.minReps != null) {
    parts.push(`${exercise.minReps} reps per set`)
  }

  if (exercise.minWeight != null) {
    parts.push(`${exercise.minWeight} lbs`)
  }

  return parts.length
    ? `Minimum: ${parts.join(' · ')}`
    : 'No minimum targets'
}

function CoachInstructions({ instructions }) {
  if (!instructions?.trim()) return null

  const urlPattern = /https?:\/\/[^\s<>"']+/g

  return (
    <>
      <h2 className="section-title">
        Coach Instructions
      </h2>

      <section className="sheet"  style={{ marginBottom: '10px' }}>
        <div
          style={{
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            lineHeight: 1.6,
          }}
        >
          {instructions.split(urlPattern).reduce(
            (parts, text, index, all) => {
              parts.push(text)

              const matchedUrls =
                instructions.match(urlPattern) || []

              if (index < matchedUrls.length) {
                const url = matchedUrls[index]

                parts.push(
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      textDecoration: 'underline',
                    }}
                  >
                    {url}
                  </a>
                )
              }

              return parts
            },
            []
          )}
        </div>
      </section>
    </>
  )
}
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

  const coachChoice =
    workout?.exerciseSelectionMode === 'coach'

  useEffect(() => {
    if (!user) return

    let active = true

    async function load() {
      setLoading(true)
      setError('')

      try {
        const w = await getWorkout(id)

        if (!active) return

        if (!w) {
          setError('Workout not found.')
          return
        }

        setWorkout(w)

        if (w.status === 'completed') {
          const savedEntries = await getEntriesForStudent(
            id,
            user.uid
          )

          if (active) setEntries(savedEntries)
        } else if (w.exerciseSelectionMode === 'coach') {
          const initial = {}

          for (const group of w.muscleGroups) {
            for (const exercise of w.assignedExercises?.[group] || []) {
              const key = exerciseKey(
                group,
                exercise.exerciseName
              )

              initial[key] = {
                muscleGroup: group,
                exerciseName: exercise.exerciseName,
                sets: '',
                reps: '',
                weight: '',
              }
            }
          }

          if (active) setPicked(initial)
        } else {
          const exerciseList = await getExerciseOptions(
            w.muscleGroups
          )

          if (active) setOptions(exerciseList)
        }
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [id, user])

  function toggleExercise(group, name) {
    if (coachChoice) return

    const key = exerciseKey(group, name)

    setPicked((current) => {
      if (current[key]) {
        const updated = { ...current }
        delete updated[key]
        return updated
      }

      return {
        ...current,
        [key]: {
          muscleGroup: group,
          exerciseName: name,
          sets: '',
          reps: '',
          weight: '',
        },
      }
    })
  }

  function updateField(key, field, value) {
    setPicked((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [field]: value,
      },
    }))
  }

  function renderMetrics(group, name, requirements = null) {
    const key = exerciseKey(group, name)
    const entry = picked[key]

    if (!entry) return null

    const fields = [
      {
        field: 'sets',
        label: 'Sets',
        minimum: requirements?.minSets ?? null,
        step: '1',
      },
      {
        field: 'reps',
        label: 'Reps',
        minimum: requirements?.minReps ?? null,
        step: '1',
      },
      {
        field: 'weight',
        label: 'Weight (lbs)',
        minimum: requirements?.minWeight ?? null,
        step: 'any',
      },
    ]

    return (
      <div className="metrics">
        {fields.map((item) => (
          <label key={item.field}>
            {item.label}
            <input
              type="number"
              inputMode={
                item.step === 'any' ? 'decimal' : 'numeric'
              }
              min={
                item.minimum ??
                (item.field === 'weight' ? 0 : 1)
              }
              step={item.step}
              placeholder={
                item.minimum != null
                  ? `Min ${item.minimum}`
                  : '—'
              }
              value={entry[item.field]}
              onChange={(e) =>
                updateField(
                  key,
                  item.field,
                  e.target.value
                )
              }
            />
          </label>
        ))}
      </div>
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (saving) return

    const chosen = Object.values(picked)

    if (!checkInTime) {
      return setError('Select the time you were at the gym.')
    }

    if (chosen.length === 0) {
      return setError('No exercises selected.')
    }

    const missingGroups = workout.muscleGroups.filter(
      (group) =>
        !chosen.some(
          (entry) => entry.muscleGroup === group
        )
    )

    if (missingGroups.length > 0) {
      return setError(
        `An exercise is required for: ${missingGroups.join(', ')}.`
      )
    }

    for (const entry of chosen) {
      const sets = Number(entry.sets)
      const reps = Number(entry.reps)

      if (
        entry.sets === '' ||
        entry.reps === '' ||
        !Number.isInteger(sets) ||
        !Number.isInteger(reps) ||
        sets < 1 ||
        reps < 1
      ) {
        return setError(
          `Enter valid sets and reps for ${entry.exerciseName}.`
        )
      }

      if (
        entry.weight !== '' &&
        (!Number.isFinite(Number(entry.weight)) ||
          Number(entry.weight) < 0)
      ) {
        return setError(
          `Enter a valid weight for ${entry.exerciseName}.`
        )
      }
    }

    if (coachChoice) {
      for (const group of workout.muscleGroups) {
        const required =
          workout.assignedExercises?.[group] || []

        for (const exercise of required) {
          const entry = picked[
            exerciseKey(group, exercise.exerciseName)
          ]

          if (!entry) {
            return setError(
              `${exercise.exerciseName} is required.`
            )
          }

          if (
            exercise.minSets != null &&
            Number(entry.sets) < exercise.minSets
          ) {
            return setError(
              `${exercise.exerciseName} requires at least ${exercise.minSets} sets.`
            )
          }

          if (
            exercise.minReps != null &&
            Number(entry.reps) < exercise.minReps
          ) {
            return setError(
              `${exercise.exerciseName} requires at least ${exercise.minReps} reps per set.`
            )
          }

          if (
            exercise.minWeight != null &&
            (
              entry.weight === '' ||
              Number(entry.weight) < exercise.minWeight
            )
          ) {
            return setError(
              `${exercise.exerciseName} requires at least ${exercise.minWeight} lbs.`
            )
          }
        }
      }
    }

    if (!YOUTUBE_PATTERN.test(videoLink.trim())) {
      return setError(
        'Paste a valid YouTube link starting with https://'
      )
    }

    setSaving(true)

    try {
      await submitWorkout(workout, {
        checkInTime,
        videoLink: videoLink.trim(),
        entries: chosen.map((entry) => ({
          muscleGroup: entry.muscleGroup,
          exerciseName: entry.exerciseName,
          sets: Number(entry.sets),
          reps: Number(entry.reps),
          weight:
            entry.weight === ''
              ? null
              : Number(entry.weight),
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

  if (workout.status === 'completed') {
    return (
      <AppShell backTo="/workouts">
        <h1 className="page-title">
          Workout {formatDate(workout.date)}
        </h1>

        <div className="page-meta">
          <StatusBadge status="completed" />
          <span>
            At the gym at {formatTime(workout.checkInTime)}
          </span>
        </div>

        <div className="stack">
          <CoachInstructions
            instructions={workout.coachInstructions}
          />

          <EntryGroups
            muscleGroups={workout.muscleGroups}
            entries={entries}
          />

          <VideoLink
            url={workout.videoLink}
            label="Watch your video"
          />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell backTo="/workouts">
      <h1 className="page-title">
        Workout {formatDate(workout.date)}
      </h1>

      <p className="page-sub">
        {coachChoice
          ? 'Complete the exercises assigned by your coach.'
          : 'Pick at least one exercise for each muscle group, then log your sets.'}
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <CoachInstructions
          instructions={workout.coachInstructions}
        />
        <section className="sheet">
          <div className="field">
            <label htmlFor="checkin">
              Time you were at the gym
            </label>
            <input
              id="checkin"
              type="time"
              value={checkInTime}
              onChange={(e) =>
                setCheckInTime(e.target.value)
              }
            />
          </div>
        </section>

        <h2 className="section-title">
          {coachChoice
            ? 'Assigned Exercises'
            : 'Pick Your Exercises'}
        </h2>

        {workout.muscleGroups.map((group) => {
          const prescribed =
            workout.assignedExercises?.[group] || []

          const names = coachChoice
            ? prescribed.map((e) => e.exerciseName)
            : options[group] || []

          const count = Object.values(picked).filter(
            (entry) => entry.muscleGroup === group
          ).length

          return (
            <details
              key={group}
              className="group"
              open
            >
              <summary>
                <span className="group-name">
                  {group}
                </span>
                <span className={`count${count > 0 ? ' is-set' : ''}`}>
                  {coachChoice
                    ? `${names.length} required`
                    : count > 0
                      ? `${count} picked`
                      : 'None yet'}
                </span>
              </summary>

              <div className="group-body">
                {names.length === 0 && (
                  <p className="hint">
                    No exercises available for this group.
                  </p>
                )}

                {names.map((name) => {
                  const key = exerciseKey(group, name)
                  const selected = picked[key]

                  const requirements = coachChoice
                    ? prescribed.find(
                        (item) => item.exerciseName === name
                      )
                    : null

                  return (
                    <div key={key} className="exercise">
                      {coachChoice ? (
                        <>
                          <div className="row-title">
                            {name}
                          </div>

                          <p className="hint">
                            {minimumDescription(requirements)}
                          </p>

                          {renderMetrics(
                            group,
                            name,
                            requirements
                          )}
                        </>
                      ) : (
                        <>
                          <label className="choice choice-row">
                            <input
                              type="checkbox"
                              checked={!!selected}
                              onChange={() =>
                                toggleExercise(group, name)
                              }
                            />
                            <span>{name}</span>
                          </label>

                          {selected &&
                            renderMetrics(group, name)}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </details>
          )
        })}

        <h2 className="section-title">Your Video</h2>

        <section className="sheet">
          <div className="field">
            <label htmlFor="video">
              YouTube Link
            </label>
            <input
              id="video"
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="https://youtu.be/..."
              value={videoLink}
              onChange={(e) =>
                setVideoLink(e.target.value)
              }
            />
            <p className="hint">
              Upload it as Unlisted so your coach can open it.
            </p>
          </div>
        </section>

        <div className="actionbar">
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={saving}
          >
            {saving
              ? 'Submitting…'
              : 'Submit Workout'}
          </button>
        </div>
      </form>
    </AppShell>
  )
}
