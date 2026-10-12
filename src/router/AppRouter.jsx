import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute.jsx'
import Login from '../pages/Login.jsx'
import WorkoutList from '../pages/student/WorkoutList.jsx'
import WorkoutDetail from '../pages/student/WorkoutDetail.jsx'
import CreateWorkout from '../pages/coach/CreateWorkout.jsx'
import AthleteWorkouts from '../pages/coach/AthleteWorkouts.jsx'
import WorkoutReview from '../pages/coach/WorkoutReview.jsx'
import AssignMuscleGroups from '../pages/coach/AssignMuscleGroups.jsx'
import Account from '../pages/coach/Account.jsx'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute role="student" />}>
        <Route path="/workouts" element={<WorkoutList />} />
        <Route path="/workouts/:id" element={<WorkoutDetail />} />
      </Route>

      <Route element={<ProtectedRoute role="coach" />}>
        <Route path="/coach/create" element={<CreateWorkout />} />
        <Route path="/coach/athlete/:id" element={<AthleteWorkouts />} />
        <Route path="/coach/review/:id" element={<WorkoutReview />} />
        <Route path="/coach/assign" element={<AssignMuscleGroups />} />
        <Route path="/coach/account" element={<Account />} />
      </Route>
    </Routes>
  )
}