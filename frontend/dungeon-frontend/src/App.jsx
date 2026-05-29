import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './Login'
import Register from './Register'
import Dashboard from './components/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import Day from './Day.jsx'
import Night from './Night.jsx'
import Dungeon1 from './Dungeon1.jsx'
import Dungeon2 from './Dungeon2.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/day" element={<Day />} />
        <Route path="/night" element={<Night />} />
        <Route path="/dungeon1" element={<Dungeon1 />} />
        <Route path="/dungeon2" element={<Dungeon2 />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        {/* ProtectedRoute wraps any route that requires a valid JWT in localStorage.
            To add more protected routes, nest them the same way. */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App