import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../services/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [coachId, setCoachId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // role and coachId are set as custom claims by the
        // createStudentAccount Cloud Function (Phase 4).
        const tokenResult = await firebaseUser.getIdTokenResult()
        setUser(firebaseUser)
        setRole(tokenResult.claims.role ?? null)
        setCoachId(tokenResult.claims.coachId ?? null)
      } else {
        setUser(null)
        setRole(null)
        setCoachId(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ user, role, coachId, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
