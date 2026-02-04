import { useSyncExternalStore } from 'react'
import { useRouter } from '@tanstack/react-router'

import { getSessionUser, logoutSession, type SessionUser } from '@/services/auth'

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthSnapshot {
  user: SessionUser
  status: AuthStatus
}

export interface AuthStore {
  getSnapshot: () => AuthSnapshot
  subscribe: (listener: () => void) => () => void
  setUser: (user: SessionUser | null) => void
  hydrateWith: (user: SessionUser | null) => void
  ensureSession: () => Promise<SessionUser>
  logout: () => Promise<void>
  hasHydrated: () => boolean
}

const defaultSnapshot: AuthSnapshot = {
  user: null,
  status: 'idle',
}

export function createAuthStore(): AuthStore {
  let snapshot = defaultSnapshot
  let hasHydrated = false
  let inflight: Promise<SessionUser> | null = null
  const listeners = new Set<() => void>()

  const notify = () => {
    listeners.forEach((listener) => listener())
  }

  const commit = (user: SessionUser | null) => {
    snapshot = {
      user,
      status: user ? 'authenticated' : 'unauthenticated',
    }
    hasHydrated = true
    notify()
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    setUser: (user: SessionUser | null) => {
      commit(user)
    },
    hydrateWith: (user: SessionUser | null) => {
      commit(user)
    },
    ensureSession: async () => {
      if (hasHydrated) {
        return snapshot.user
      }

      if (!inflight) {
        snapshot = {
          user: null,
          status: 'loading',
        }
        notify()

        inflight = getSessionUser()
          .then(({ user }) => {
            commit(user)
            return user
          })
          .finally(() => {
            inflight = null
          })
      }

      return inflight
    },
    logout: async () => {
      await logoutSession()
      commit(null)
    },
    hasHydrated: () => hasHydrated,
  }
}

export function useAuth() {
  const router = useRouter()
  const store = router.options.context.auth
  const snapshot = useSyncExternalStore<AuthSnapshot>(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  )

  return {
    user: snapshot.user,
    status: snapshot.status,
    setUser: store.setUser,
    ensureSession: store.ensureSession,
    logout: store.logout,
    hasHydrated: store.hasHydrated,
  }
}
