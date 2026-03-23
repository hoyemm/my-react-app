
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/home';
import { Signup } from './pages/signup';
import { User } from './pages/user';
import './App.css'

function App() {

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/user" element={<User />} />
        </Routes>
      </Router>

    </>
  )
}

export default App
