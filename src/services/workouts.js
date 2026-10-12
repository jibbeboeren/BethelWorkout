import { db } from './firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore'

// Get available muscle groups
export async function getMuscleGroups() {
  const snap = await getDocs(collection(db, 'muscleGroups'))
  return snap.docs.map((d) => d.data().name)
}

// Create workouts with optional coach-assigned exercises
export async function createWorkoutsForStudents({
  coachId,
  students,
  date,
  muscleGroups,
  exerciseSelectionMode = 'student',
  assignedExercises = {},
  coachInstructions = '',
}) {
  if (!students.length) {
    throw new Error('Select at least one athlete.')
  }

  if (exerciseSelectionMode === 'coach') {
    for (const group of muscleGroups) {
      if (!assignedExercises[group]?.length) {
        throw new Error(
          `At least one exercise is required for ${group}.`
        )
      }
    }
  }

  const batch = writeBatch(db)

  students.forEach((student) => {
    const ref = doc(collection(db, 'workouts'))

    batch.set(ref, {
      coachId,
      studentId: student.id,
      studentName: student.name,
      date,
      muscleGroups,
      exerciseSelectionMode,
      assignedExercises:
        exerciseSelectionMode === 'coach'
          ? assignedExercises
          : {},
      status: 'pending',
      createdAt: serverTimestamp(),
      coachInstructions,
    })
  })

  await batch.commit()
}

// Student workouts, oldest first
export async function getWorkoutsForStudent(studentId) {
  const q = query(
    collection(db, 'workouts'),
    where('studentId', '==', studentId)
  )

  const snap = await getDocs(q)

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Get one workout
export async function getWorkout(workoutId) {
  const snap = await getDoc(doc(db, 'workouts', workoutId))

  return snap.exists()
    ? { id: snap.id, ...snap.data() }
    : null
}

// Exercise options grouped by muscle group
export async function getExerciseOptions(muscleGroups) {
  const result = {}

  await Promise.all(
    muscleGroups.map(async (group) => {
      const snap = await getDocs(
        collection(db, 'exerciseLibrary', group, 'exercises')
      )

      result[group] = [
        ...new Set(snap.docs.map((d) => d.data().name)),
      ]
    })
  )

  return result
}

// Entries visible to the student
export async function getEntriesForStudent(workoutId, studentId) {
  const q = query(
    collection(db, 'workouts', workoutId, 'entries'),
    where('studentId', '==', studentId)
  )

  const snap = await getDocs(q)

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }))
}

// Submit a completed workout
export async function submitWorkout(
  workout,
  { checkInTime, videoLink, entries }
) {
  const batch = writeBatch(db)
  const workoutRef = doc(db, 'workouts', workout.id)

  entries.forEach((entry) => {
    const entryRef = doc(collection(workoutRef, 'entries'))

    batch.set(entryRef, {
      studentId: workout.studentId,
      coachId: workout.coachId,
      muscleGroup: entry.muscleGroup,
      exerciseName: entry.exerciseName,
      sets: entry.sets,
      reps: entry.reps,
      weight: entry.weight,
      createdAt: serverTimestamp(),
    })
  })

  batch.update(workoutRef, {
    status: 'completed',
    checkInTime,
    videoLink,
    completedAt: serverTimestamp(),
  })

  await batch.commit()
}

// Coach workouts for a specific athlete, newest first
export async function getWorkoutsForCoachStudent(
  coachId,
  studentId
) {
  const q = query(
    collection(db, 'workouts'),
    where('coachId', '==', coachId),
    where('studentId', '==', studentId)
  )

  const snap = await getDocs(q)

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

// Entries visible to the coach
export async function getEntriesForCoach(workoutId, coachId) {
  const q = query(
    collection(db, 'workouts', workoutId, 'entries'),
    where('coachId', '==', coachId)
  )

  const snap = await getDocs(q)

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }))
}

// Listen for changes to workouts assigned by a coach.
export function subscribeToCoachWorkouts(
  coachId,
  onWorkouts,
  onError
) {
  const q = query(
    collection(db, 'workouts'),
    where('coachId', '==', coachId)
  )

  return onSnapshot(
    q,
    (snapshot) => {
      const workouts = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }))

      onWorkouts(workouts)
    },
    onError
  )
}