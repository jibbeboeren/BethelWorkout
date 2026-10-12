import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

// Backed by the createStudentAccount Cloud Function - implemented in Phase 4.
// Calling this from the client never touches the coach's own Auth session,
// since account creation happens server-side via the Admin SDK.
export const createStudentAccount = httpsCallable(functions, 'createStudentAccount')
