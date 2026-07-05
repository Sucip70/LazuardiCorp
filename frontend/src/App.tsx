import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth'
import AccountPage from './pages/AccountPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import NewProjectPage from './pages/NewProjectPage'
import ProjectEditor from './pages/ProjectEditor'
import RendererDemoPage from './pages/RendererDemoPage'
import TemplatesPage from './pages/TemplatesPage'
import VisualEditorPage from './pages/VisualEditorPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/projects/new" element={<RequireAuth><NewProjectPage /></RequireAuth>} />
        <Route path="/projects/:id" element={<RequireAuth><ProjectEditor /></RequireAuth>} />
        <Route path="/projects/:id/visual" element={<RequireAuth><VisualEditorPage /></RequireAuth>} />
        <Route path="/editor" element={<RequireAuth><VisualEditorPage /></RequireAuth>} />
        <Route path="/renderer-demo" element={<RendererDemoPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
