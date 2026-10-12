const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')

initializeApp()

exports.createStudentAccount = onCall(async (request) => {
  const { auth, data } = request

  if (!auth || auth.token.role !== 'coach') {
    throw new HttpsError('permission-denied', 'Only coaches can create student accounts')
  }

  const { name, email, password } = data
  if (!name || !email || !password) {
    throw new HttpsError('invalid-argument', 'name, email and password are required')
  }

  const adminAuth = getAuth()
  const db = getFirestore()

  let userRecord
  try {
    userRecord = await adminAuth.createUser({ email, password, displayName: name })
  } catch (err) {
    throw new HttpsError('already-exists', err.message)
  }

  await adminAuth.setCustomUserClaims(userRecord.uid, {
    role: 'student',
    coachId: auth.uid,
  })

  await db.collection('users').doc(userRecord.uid).set({
    name,
    role: 'student',
    coachId: auth.uid,
    createdAt: FieldValue.serverTimestamp(),
  })

  return { uid: userRecord.uid }
})