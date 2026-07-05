import { type FormEvent, useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { changePassword, updateProfile } from '../api/auth'
import { AppShell } from '../components/layout/AppShell'
import { useCurrentUser } from '../hooks/useCurrentUser'

export default function AccountPage() {
  const { user, loading, setUser } = useCurrentUser()
  const [name, setName] = useState('')
  const [profileMsg, setProfileMsg] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    if (user?.name) setName(user.name)
  }, [user?.name])

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMsg(null)
    setProfileError(null)
    try {
      const updated = await updateProfile(name)
      setUser(updated)
      setProfileMsg('Profile updated.')
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : 'Update failed')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    setSavingPassword(true)
    setPasswordMsg(null)
    setPasswordError(null)
    try {
      await changePassword(currentPassword, newPassword)
      setPasswordMsg('Password changed successfully.')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Password change failed')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-gray-900">Account settings</h1>
        <p className="mt-1 text-gray-500">Manage your profile and security.</p>

        {loading && <p className="mt-6 text-sm text-gray-500">Loading…</p>}

        {user && (
          <div className="mt-8 space-y-8">
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
              <form className="mt-4 space-y-4" onSubmit={(e) => void handleProfileSubmit(e)}>
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">Display name</span>
                  <input
                    required
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">Email</span>
                  <input
                    disabled
                    className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500"
                    value={user.email}
                  />
                </label>
                <p className="text-xs text-gray-400">User ID: {user.id}</p>
                {profileMsg && <p className="text-sm text-green-600">{profileMsg}</p>}
                {profileError && <p className="text-sm text-red-600">{profileError}</p>}
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingProfile ? 'Saving…' : 'Save profile'}
                </button>
              </form>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Change password</h2>
              <form className="mt-4 space-y-4" onSubmit={(e) => void handlePasswordSubmit(e)}>
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">Current password</span>
                  <input
                    required
                    type="password"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-gray-700">New password</span>
                  <input
                    required
                    type="password"
                    minLength={8}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </label>
                {passwordMsg && <p className="text-sm text-green-600">{passwordMsg}</p>}
                {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  {savingPassword ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  )
}
