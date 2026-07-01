import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/Auth/LoginPage'
import RegisterPage from './pages/Auth/RegisterPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import WorkoutsPage from './pages/Workouts/WorkoutsPage'
import WorkoutDetailPage from './pages/Workouts/WorkoutDetailPage'
import CreateWorkoutPage from './pages/Workouts/CreateWorkoutPage'
import WorkoutSessionPage from './pages/Workouts/WorkoutSessionPage'
import CalendarPage from './pages/Calendar/CalendarPage'
import AnalyticsPage from './pages/Analytics/AnalyticsPage'
import ProfilePage from './pages/Profile/ProfilePage'

const PrivateRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

const PublicRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return !isAuthenticated ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Private — wrapped in AppShell (bottom nav) */}
      <Route path="/" element={<PrivateRoute><AppShell /></PrivateRoute>}>
        <Route index             element={<DashboardPage />} />
        <Route path="workouts"   element={<WorkoutsPage />} />
        <Route path="workouts/new" element={<CreateWorkoutPage />} />
        <Route path="workouts/:id" element={<WorkoutDetailPage />} />
        <Route path="session/:workoutId" element={<WorkoutSessionPage />} />
        <Route path="session/:workoutId/occ/:occId" element={<WorkoutSessionPage />} />
        <Route path="calendar"   element={<CalendarPage />} />
        <Route path="analytics"  element={<AnalyticsPage />} />
        <Route path="profile"    element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
