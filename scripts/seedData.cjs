// scripts/seedData.cjs - safe to run more than once
const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const serviceAccount = require('./serviceAccountKey.json')

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

const exerciseOptions = {
  Hamstrings: ['Deadlift', 'Leg Curl'],
  Quads: ['Squats', 'Leg Press'],
  Calves: ['Barbell Calf Raise', 'Standing Calf Raise'],
  Glutes: ['Hip Thrust', 'Glute Bridge'],
  Abs: ['Sit Ups', 'V Ups'],
  Bicep: ['Barbell Curl', 'Hammer Curl'],
}

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

async function main() {
  for (const [group, exercises] of Object.entries(exerciseOptions)) {
    await db.collection('muscleGroups').doc(group).set({ name: group })

    const exercisesRef = db.collection('exerciseLibrary').doc(group).collection('exercises')

    // Remove whatever is there now (including the duplicates)
    const existing = await exercisesRef.get()
    const batch = db.batch()
    existing.docs.forEach((d) => batch.delete(d.ref))

    // Fixed IDs, so running this again can never create duplicates
    exercises.forEach((name) => batch.set(exercisesRef.doc(slug(name)), { name }))

    await batch.commit()
    console.log(`Seeded ${group}`)
  }
  console.log('Done.')
}

main()