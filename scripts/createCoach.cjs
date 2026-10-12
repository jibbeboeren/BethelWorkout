// scripts/createCoach.cjs — run once with: node scripts/createCoach.cjs
const { initializeApp, cert } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const serviceAccount = require('./serviceAccountKey.json')

initializeApp({
  credential: cert(serviceAccount),
})

async function main() {
  const auth = getAuth()

  const user = await auth.createUser({
    email: 'coach@example.com',      // change to your real email
    password: 'ChangeMe123!',        // change to your real password
    displayName: 'Jose Viera',
  })

  await auth.setCustomUserClaims(user.uid, { role: 'coach' })

  console.log('Created coach:', user.uid)
}

main()