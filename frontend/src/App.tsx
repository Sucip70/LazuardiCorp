import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ProjectEditor from './pages/ProjectEditor'
import ProjectList from './pages/ProjectList'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectList />} />
        <Route path="/projects/new" element={<ProjectEditor />} />
        <Route path="/projects/:id" element={<ProjectEditor />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
