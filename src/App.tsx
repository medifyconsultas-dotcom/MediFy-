import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingScreen from './components/LoadingScreen'
import ErrorBoundary from './components/ErrorBoundary'
import Funcionarios from './pages/clinica/Funcionarios'
import Perfil from './pages/Perfil'
import Prontuarios from './pages/Prontuarios'
import Consultas from './pages/Consultas'
import PerfilNaoSuportado from './pages/PerfilNaoSuportado'
import PerfilNaoEncontrado from './pages/PerfilNaoEncontrado'
import ToastContainer from './components/Toast'

function AppRoutes() {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/consultas"
        element={
          <ProtectedRoute>
            <Consultas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/funcionarios"
        element={
          <ProtectedRoute allowedProfiles={['clinica']}>
            <Funcionarios />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/perfil"
        element={
          <ProtectedRoute>
            <Perfil />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/prontuarios"
        element={
          <ProtectedRoute allowedProfiles={['profissional', 'medico', 'recepcionista']}>
            <Prontuarios />
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil-nao-suportado"
        element={
          <ProtectedRoute>
            <PerfilNaoSuportado />
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil-nao-encontrado"
        element={
          <ProtectedRoute>
            <PerfilNaoEncontrado />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/" 
        element={currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} 
      />
    </Routes>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <ThemeProvider>
            <AppRoutes />
            <ToastContainer />
          </ThemeProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App

