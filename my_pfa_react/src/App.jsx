
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import  Home  from './pages/Home';
import Signup  from './pages/Signup';
import  User  from './pages/User';
import  Login  from './pages/Login';
import './App.css'

function App() {

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/Signup" element={<Signup />} />
          <Route path="/User" element={<User />} />
          <Route path="/Login" element={<Login />} />
        </Routes>
      </Router>

    </>
  )
}

export default App
