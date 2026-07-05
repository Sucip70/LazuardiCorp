import { Link } from 'react-router-dom'
import { isAuthenticated } from '../api/auth'
import { RequireAuth } from '../components/RequireAuth'
import { DashboardPage } from './DashboardPage'

function PublicLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-sm font-bold">
            L
          </span>
          Lazuardi
        </div>
        <div className="flex gap-2">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:text-white"
          >
            Sign in
          </Link>
          <Link
            to="/login"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            Get started
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-blue-400">
            No-code website builder
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Design, preview, and publish websites without writing code.
          </h1>
          <p className="mt-6 text-lg text-slate-400">
            Drag-and-drop components, responsive layouts, templates for landing pages,
            blogs, stores, and more — then deploy to Netlify, Vercel, or AWS.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold hover:bg-blue-500"
            >
              Start building free
            </Link>
            <Link
              to="/templates"
              className="rounded-lg border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-200 hover:border-slate-500"
            >
              Browse templates
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { title: 'Visual editor', desc: 'Canvas, layers, properties panel, and live preview.' },
            { title: 'Templates', desc: 'Landing, business, portfolio, blog, and e-commerce starters.' },
            { title: 'Deploy anywhere', desc: 'Export static sites or one-click deploy to your host.' },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-5"
            >
              <h3 className="font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default function HomePage() {
  if (!isAuthenticated()) {
    return <PublicLanding />
  }
  return (
    <RequireAuth>
      <DashboardPage />
    </RequireAuth>
  )
}
