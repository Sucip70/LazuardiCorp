import { useEffect, useState } from 'react'
import { fetchMe, type User } from '../api/auth'

let cachedUser: User | null = null

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(cachedUser)
  const [loading, setLoading] = useState(!cachedUser)

  useEffect(() => {
    let active = true
    fetchMe()
      .then((u) => {
        if (!active) return
        cachedUser = u
        setUser(u)
      })
      .catch(() => {
        if (active) {
          cachedUser = null
          setUser(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  function updateUser(u: User | null) {
    cachedUser = u
    setUser(u)
  }

  return { user, loading, setUser: updateUser }
}

export function clearUserCache() {
  cachedUser = null
}
