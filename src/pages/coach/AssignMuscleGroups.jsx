
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppShell from '../../components/AppShell.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getStudentsForCoach } from '../../services/users'
import {
  getMuscleGroups,
  getExerciseOptions,
  createWorkoutsForStudents,
} from '../../services/workouts'
import {
  getWorkoutTemplate,
  saveWorkoutTemplate,
  updateWorkoutTemplate,
} from '../../services/workoutTemplates'

const emptyTargets = () => ({
  minSets: '',
  minReps: '',
  minWeight: '',
})

function validMinimum(value, integer, allowZero = false) {
  if (value === '') return true

  const number = Number(value)

  return (
    Number.isFinite(number) &&
    (allowZero ? number >= 0 : number > 0) &&
    (!integer || Number.isInteger(number))
  )
}

export default function AssignMuscleGroups() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const templateToUse = searchParams.get('template')
  const templateToEdit = searchParams.get('editTemplate')
  const templateId = templateToEdit || templateToUse

  const [students, setStudents] = useState([])
  const [muscleGroups, setMuscleGroups] = useState([])
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [selectedGroups, setSelectedGroups] = useState([])
  const [date, setDate] = useState('')

  const [selectionMode, setSelectionMode] = useState('student')
  const [exerciseOptions, setExerciseOptions] = useState({})
  const [assignedExercises, setAssignedExercises] = useState({})

  const [templateName, setTemplateName] = useState('')
  const [coachInstructions, setCoachInstructions] = useState('')
  const [loadedTemplateId, setLoadedTemplateId] = useState(null)

  const [loading, setLoading] = useState(true)
  const [loadingExercises, setLoadingExercises] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  // Load athletes, muscle groups and optional template.
  useEffect(() => {
    if (!user) return

    let active = true

    async function load() {
      setLoading(true)
      setError('')
      setLoadedTemplateId(null)

      try {
        const [studentList, groupList] = await Promise.all([
          getStudentsForCoach(user.uid),
          getMuscleGroups(),
        ])

        if (!active) return

        setStudents(
          [...studentList].sort((a, b) =>
            (a.name || '').localeCompare(b.name || '')
          )
        )
        setMuscleGroups(groupList)

        if (templateId) {
          const template = await getWorkoutTemplate(templateId)

          if (!active) return

          if (!template || template.coachId !== user.uid) {
            throw new Error('Template not found or access denied.')
          }

          setTemplateName(template.name || '')
          setCoachInstructions(template.coachInstructions || '')
          setSelectedGroups(template.muscleGroups || [])
          setSelectionMode(
            template.exerciseSelectionMode || 'student'
          )

          const restored = {}

          for (const [group, exercises] of Object.entries(
            template.assignedExercises || {}
          )) {
            restored[group] = exercises.map((exercise) => ({
              exerciseName: exercise.exerciseName,
              minSets: exercise.minSets ?? '',
              minReps: exercise.minReps ?? '',
              minWeight: exercise.minWeight ?? '',
            }))
          }

          setAssignedExercises(restored)
          setLoadedTemplateId(templateId)
        } else {
          setTemplateName('')
          setSelectedGroups([])
          setSelectionMode('student')
          setAssignedExercises({})
          setCoachInstructions('')
        }

        setSelectedStudentIds([])
        setDate('')
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
  }, [user, templateId])

  // Load exercise library when coach selects exercises.
  useEffect(() => {
    if (
      loading ||
      selectionMode !== 'coach' ||
      selectedGroups.length === 0
    ) {
      setLoadingExercises(false)
      return
    }

    let active = true
    setLoadingExercises(true)

    getExerciseOptions(selectedGroups)
      .then((options) => {
        if (active) setExerciseOptions(options)
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoadingExercises(false)
      })

    return () => {
      active = false
    }
  }, [loading, selectionMode, selectedGroups])

  function toggle(setter, value) {
    setter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    )
  }

  function toggleExercise(group, exerciseName) {
    setAssignedExercises((current) => {
      const exercises = current[group] || []

      const exists = exercises.some(
        (item) => item.exerciseName === exerciseName
      )

      return {
        ...current,
        [group]: exists
          ? exercises.filter(
              (item) => item.exerciseName !== exerciseName
            )
          : [
              ...exercises,
              { exerciseName, ...emptyTargets() },
            ],
      }
    })
  }

  function updateTarget(group, exerciseName, field, value) {
    setAssignedExercises((current) => ({
      ...current,
      [group]: (current[group] || []).map((exercise) =>
        exercise.exerciseName === exerciseName
          ? { ...exercise, [field]: value }
          : exercise
      ),
    }))
  }

  // Validate workout configuration independently of date/athletes.
  function buildWorkoutConfiguration() {
    if (selectedGroups.length === 0) {
      throw new Error('Pick at least one muscle group.')
    }

    if (selectionMode !== 'coach') {
      return {
        muscleGroups: selectedGroups,
        exerciseSelectionMode: 'student',
        assignedExercises: {},
        coachInstructions: coachInstructions.trim(),
      }
    }

    if (loadingExercises) {
      throw new Error('Wait for the exercise library to load.')
    }

    const prescribed = {}

    for (const group of selectedGroups) {
      const exercises = assignedExercises[group] || []

      if (exercises.length === 0) {
        throw new Error(
          `Select at least one exercise for ${group}.`
        )
      }

      for (const exercise of exercises) {
        if (
          !validMinimum(exercise.minSets, true) ||
          !validMinimum(exercise.minReps, true) ||
          !validMinimum(exercise.minWeight, false, true)
        ) {
          throw new Error(
            `Check the minimum targets for ${exercise.exerciseName}.`
          )
        }
      }

      prescribed[group] = exercises.map((exercise) => ({
        exerciseName: exercise.exerciseName,
        minSets:
          exercise.minSets === ''
            ? null
            : Number(exercise.minSets),
        minReps:
          exercise.minReps === ''
            ? null
            : Number(exercise.minReps),
        minWeight:
          exercise.minWeight === ''
            ? null
            : Number(exercise.minWeight),
      }))
    }

    return {
      muscleGroups: selectedGroups,
      exerciseSelectionMode: 'coach',
      assignedExercises: prescribed,
      coachInstructions: coachInstructions.trim(),
    }
  }

  // Save a new template or update an existing template.
  // This does not create student workout assignments.
  async function handleSaveTemplate() {
    setError('')
    setStatus('')

    if (!templateName.trim()) {
      setError('Enter a template name.')
      return
    }

    if (saving) return

    let configuration

    try {
      configuration = buildWorkoutConfiguration()
    } catch (err) {
      setError(err.message)
      return
    }

    setSaving(true)

    try {
      const templateData = {
        coachId: user.uid,
        name: templateName.trim(),
        ...configuration,
      }

      if (templateToEdit) {
        if (loadedTemplateId !== templateToEdit) {
          throw new Error('Template has not finished loading.')
        }

        await updateWorkoutTemplate(
          templateToEdit,
          user.uid,
          templateData
        )

        setStatus('Template updated successfully.')
      } else {
        await saveWorkoutTemplate(templateData)
        setStatus('Template saved successfully.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Assign a workout to the selected athletes.
  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setStatus('')

    if (saving) return

    if (templateId && loadedTemplateId !== templateId) {
      setError('Template has not finished loading.')
      return
    }

    if (!date) {
      setError('Pick a workout date.')
      return
    }

    if (selectedStudentIds.length === 0) {
      setError('Pick at least one athlete.')
      return
    }

    let configuration

    try {
      configuration = buildWorkoutConfiguration()
    } catch (err) {
      setError(err.message)
      return
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
        ...configuration,
      })

      setStatus(
        `Workout created for ${chosen
          .map((student) => student.name)
          .join(', ')}.`
      )

      setDate('')
      setSelectedStudentIds([])
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell backTo="/coach/create">
      <h1 className="page-title">
        {templateToEdit
          ? 'Edit Workout Template'
          : templateToUse
            ? 'Use Workout Template'
            : 'Create Workout'}
      </h1>

      <p className="page-sub">
        {templateToEdit
          ? 'Update your saved workout or assign it to athletes.'
          : 'Assign athletes, muscle groups, and exercise requirements.'}
      </p>

      {loading ? (
        <p className="loading">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {templateId && loadedTemplateId === templateId && (
            <div className="notice">
              Loaded template: {templateName}
            </div>
          )}

          <h2 className="section-title">Workout Details</h2>

          <section className="sheet">
            <div className="field">
              <label htmlFor="workout-date">
                Workout Date
              </label>

              <input
                id="workout-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </section>

          <h2 className="section-title">Select Athletes</h2>

          {students.length === 0 ? (
            <div className="empty">
              <p>
                No athletes yet. Create one from the Account page.
              </p>
            </div>
          ) : (
            <div className="stack" style={{ gap: '10px' }}>
              {students.map((student) => (
                <label
                  className="choice choice-row"
                  key={student.id}
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

          <h2 className="section-title">
            Select Muscle Groups
          </h2>

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

          <p
            className="hint"
            style={{ marginTop: '12px' }}
          >
            {selectedGroups.length} muscle group(s) selected
          </p>

          <h2 className="section-title">
            Exercise Selection
          </h2>

          <div className="stack" style={{ gap: '10px' }}>
            <label className="choice choice-row">
              <input
                type="radio"
                name="exercise-selection"
                checked={selectionMode === 'student'}
                onChange={() =>
                  setSelectionMode('student')
                }
              />

              <span>
                <strong>Student's Choice</strong>

                <span className="row-sub">
                  Students select their own exercises.
                </span>
              </span>
            </label>

            <label className="choice choice-row">
              <input
                type="radio"
                name="exercise-selection"
                checked={selectionMode === 'coach'}
                onChange={() =>
                  setSelectionMode('coach')
                }
              />

              <span>
                <strong>Coach's Choice</strong>

                <span className="row-sub">
                  Assign required exercises and minimum targets.
                </span>
              </span>
            </label>
          </div>

          {selectionMode === 'coach' && (
            <>
              <h2 className="section-title">
                Required Exercises
              </h2>

              {selectedGroups.length === 0 && (
                <p className="hint">
                  Select a muscle group first.
                </p>
              )}

              {loadingExercises && (
                <p className="loading">
                  Loading exercises…
                </p>
              )}

              {!loadingExercises &&
                selectedGroups.map((group) => (
                  <details
                    key={group}
                    className="group"
                    open
                  >
                    <summary>
                      <span className="group-name">
                        {group}
                      </span>

                      <span className="count">
                        {(assignedExercises[group] || []).length}{' '}
                        selected
                      </span>
                    </summary>

                    <div className="group-body">
                      {(exerciseOptions[group] || []).length ===
                        0 && (
                        <p className="hint">
                          No exercises in the library for
                          this group.
                        </p>
                      )}

                      {(exerciseOptions[group] || []).map(
                        (name) => {
                          const selected = (
                            assignedExercises[group] || []
                          ).find(
                            (item) =>
                              item.exerciseName === name
                          )

                          return (
                            <div
                              key={`${group}-${name}`}
                              className="exercise"
                            >
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

                              {selected && (
                                <>
                                  <p className="hint">
                                    Optional minimum requirements
                                  </p>

                                  <div className="metrics">
                                    {[
                                      {
                                        field: 'minSets',
                                        label: 'Min. sets',
                                        step: '1',
                                        min: '1',
                                      },
                                      {
                                        field: 'minReps',
                                        label: 'Min. reps',
                                        step: '1',
                                        min: '1',
                                      },
                                      {
                                        field: 'minWeight',
                                        label: 'Min. lbs',
                                        step: 'any',
                                        min: '0',
                                      },
                                    ].map((target) => (
                                      <label key={target.field}>
                                        {target.label}

                                        <input
                                          type="number"
                                          inputMode={
                                            target.step === 'any'
                                              ? 'decimal'
                                              : 'numeric'
                                          }
                                          min={target.min}
                                          step={target.step}
                                          placeholder="—"
                                          value={
                                            selected[target.field]
                                          }
                                          onChange={(e) =>
                                            updateTarget(
                                              group,
                                              name,
                                              target.field,
                                              e.target.value
                                            )
                                          }
                                        />
                                      </label>
                                    ))}
                                  </div>

                                  <p className="hint">
                                    Leave blank for no minimum.
                                  </p>
                                </>
                              )}
                            </div>
                          )
                        }
                      )}
                    </div>
                  </details>
                ))}
            </>
          )}

          
          <h2 className="section-title">
            Coach Instructions
          </h2>

          <section className="sheet">
            <div className="field">
              <label htmlFor="coach-instructions">
                Instructions (Optional)
              </label>

              <textarea
                id="coach-instructions"
                rows={6}
                placeholder={
                  'Explain the workout, add technique tips, or paste a video link...'
                }
                value={coachInstructions}
                onChange={(e) =>
                  setCoachInstructions(e.target.value)
                }
                style={{
                  width: '100%',
                  resize: 'vertical',
                  font: 'inherit',
                  boxSizing: 'border-box',
                }}
              />

              <p className="hint">
                Students will see these instructions before
                completing their workout. You can include
                video links as well as written explanations.
              </p>
            </div>
          </section>

          <h2 className="section-title">
            Save Workout Template
          </h2>

          <section className="sheet">
            <div className="field">
              <label htmlFor="template-name">
                Template Name
              </label>

              <input
                id="template-name"
                type="text"
                placeholder="e.g. Upper Body Strength"
                value={templateName}
                onChange={(e) =>
                  setTemplateName(e.target.value)
                }
              />
            </div>

            <p className="hint">
              Saving a template does not assign a workout.
              You can reuse it whenever you want.
            </p>

            <button
              type="button"
              className="btn btn-plain btn-block"
              disabled={
                saving ||
                loadingExercises ||
                (!!templateId &&
                  loadedTemplateId !== templateId)
              }
              onClick={handleSaveTemplate}
              style={{ marginTop: '12px' }}
            >
              {saving
                ? 'Saving…'
                : templateToEdit
                  ? 'Update Template'
                  : 'Save as Template'}
            </button>
          </section>

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
              className="btn btn-primary btn-block"
              type="submit"
              disabled={
                saving ||
                loadingExercises ||
                (!!templateId &&
                  loadedTemplateId !== templateId)
              }
            >
              {saving
                ? 'Creating…'
                : 'Assign Workout'}
            </button>
          </div>
        </form>
      )}
    </AppShell>
  )
}
