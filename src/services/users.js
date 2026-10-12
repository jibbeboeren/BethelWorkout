import { db } from './firebase'
import { collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore'

export async function getStudentsForCoach(coachId) {
  const q = query(collection(db, 'users'), where('coachId', '==', coachId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getStudent(studentId) {
  const snap = await getDoc(doc(db, 'users', studentId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}