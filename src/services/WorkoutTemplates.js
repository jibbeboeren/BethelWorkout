
import { db } from './firebase'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'

const templatesCollection = collection(db, 'workoutTemplates')

export async function getWorkoutTemplates(coachId) {
  const q = query(
    templatesCollection,
    where('coachId', '==', coachId)
  )

  const snapshot = await getDocs(q)

  return snapshot.docs
    .map((document) => ({
      id: document.id,
      ...document.data(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getWorkoutTemplate(templateId) {
  const snapshot = await getDoc(
    doc(db, 'workoutTemplates', templateId)
  )

  return snapshot.exists()
    ? { id: snapshot.id, ...snapshot.data() }
    : null
}

export async function saveWorkoutTemplate({
  coachId,
  name,
  muscleGroups,
  exerciseSelectionMode,
  assignedExercises,
  coachInstructions = '',
}) {
  const cleanName = name.trim()

  if (!cleanName) {
    throw new Error('Enter a template name.')
  }

  if (!muscleGroups.length) {
    throw new Error('Select at least one muscle group.')
  }

  return addDoc(templatesCollection, {
    coachId,
    name: cleanName,
    muscleGroups,
    exerciseSelectionMode,
    assignedExercises:
      exerciseSelectionMode === 'coach'
        ? assignedExercises
        : {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    coachInstructions,
  })
}

export async function updateWorkoutTemplate(
  templateId,
  coachId,
  changes
) {
  const reference = doc(db, 'workoutTemplates', templateId)
  const snapshot = await getDoc(reference)

  if (!snapshot.exists() || snapshot.data().coachId !== coachId) {
    throw new Error('Template not found or access denied.')
  }

  const {
    name,
    muscleGroups,
    exerciseSelectionMode,
    assignedExercises,
    coachInstructions = '',
    } = changes

  await updateDoc(reference, {
    name: name.trim(),
    muscleGroups,
    exerciseSelectionMode,
    assignedExercises:
      exerciseSelectionMode === 'coach'
        ? assignedExercises
        : {},
    updatedAt: serverTimestamp(),
    coachInstructions,
  })
}

export async function deleteWorkoutTemplate(
  templateId,
  coachId
) {
  const reference = doc(db, 'workoutTemplates', templateId)
  const snapshot = await getDoc(reference)

  if (!snapshot.exists() || snapshot.data().coachId !== coachId) {
    throw new Error('Template not found or access denied.')
  }

  await deleteDoc(reference)
}
