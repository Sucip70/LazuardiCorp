import { BrowserRouter, Route, Routes } from 'react-router-dom'
import NewProjectPage from './pages/NewProjectPage'
import ProjectEditor from './pages/ProjectEditor'
import ProjectList from './pages/ProjectList'
import RendererDemoPage from './pages/RendererDemoPage'
import TemplatesPage from './pages/TemplatesPage'
import VisualEditorPage from './pages/VisualEditorPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectList />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/projects/new" element={<NewProjectPage />} />
        <Route path="/projects/:id" element={<ProjectEditor />} />
        <Route path="/projects/:id/visual" element={<VisualEditorPage />} />
        <Route path="/editor" element={<VisualEditorPage />} />
        <Route path="/renderer-demo" element={<RendererDemoPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
