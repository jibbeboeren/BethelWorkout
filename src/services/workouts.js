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
} from 'firebase/firestore'

export async function getMuscleGroups() {
  const snap = await getDocs(collection(db, 'muscleGroups'))
  return snap.docs.map((d) => d.data().name)
}

export async function createWorkoutsForStudents({ coachId, students, date, muscleGroups }) {
  const batch = writeBatch(db)

  students.forEach((student) => {
    const ref = doc(collection(db, 'workouts'))
    batch.set(ref, {
      coachId,
      studentId: student.id,
      studentName: student.name,
      date,
      muscleGroups,
      status: 'pending',
      createdAt: serverTimestamp(),
    })
  })

  await batch.commit()
}

// All workouts assigned to one student, oldest first.
// Sorted here instead of in the query so no Firestore index is needed.
export async function getWorkoutsForStudent(studentId) {
  const q = query(collection(db, 'workouts'), where('studentId', '==', studentId))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function getWorkout(workoutId) {
  const snap = await getDoc(doc(db, 'workouts', workoutId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// Exercise options per muscle group: { Abs: ['Sit Ups', 'V Ups'], ... }
export async function getExerciseOptions(muscleGroups) {
  const result = {}
  await Promise.all(
    muscleGroups.map(async (group) => {
      const snap = await getDocs(collection(db, 'exerciseLibrary', group, 'exercises'))
      result[group] = [...new Set(snap.docs.map((d) => d.data().name))]
    })
  )
  return result
}

export async function getEntriesForStudent(workoutId, studentId) {
  const q = query(
    collection(db, 'workouts', workoutId, 'entries'),
    where('studentId', '==', studentId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Writes every entry and flips the workout to 'completed' in one batch,
// so a workout can never end up half-submitted.
export async function submitWorkout(workout, { checkInTime, videoLink, entries }) {
  const batch = writeBatch(db)
  const workoutRef = doc(db, 'workouts', workout.id)

  entries.forEach((e) => {
    const entryRef = doc(collection(workoutRef, 'entries'))
    batch.set(entryRef, {
      studentId: workout.studentId,
      coachId: workout.coachId,
      muscleGroup: e.muscleGroup,
      exerciseName: e.exerciseName,
      sets: e.sets,
      reps: e.reps,
      weight: e.weight,
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

// Every workout this coach assigned to one athlete, newest first.
export async function getWorkoutsForCoachStudent(coachId, studentId) {
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

// Entries for a workout, read from the coach's side. The coachId filter is
// required: security rules aren't filters, so a query without it is rejected.
export async function getEntriesForCoach(workoutId, coachId) {
  const q = query(
    collection(db, 'workouts', workoutId, 'entries'),
    where('coachId', '==', coachId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}