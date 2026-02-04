import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AUTH_REDIRECT_TARGETS,
  DEFAULT_AUTH_REDIRECT,
  resolveAuthRedirect,
} from '@/lib/auth-redirects'
import { useAuth } from '@/lib/auth-store'
import { loginWithEmail } from '@/services/auth'

const searchSchema = z.object({
  redirectTo: z.enum(AUTH_REDIRECT_TARGETS).optional(),
})

export const Route = createFileRoute('/auth/login')({
  validateSearch: searchSchema,
  beforeLoad: async ({ context, search }) => {
    const user = await context.auth.ensureSession()
    if (user) {
      throw redirect({
        to: search.redirectTo ?? DEFAULT_AUTH_REDIRECT,
      })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const auth = useAuth()
  const { redirectTo } = Route.useSearch()
  const target = useMemo(() => resolveAuthRedirect(redirectTo), [redirectTo])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (auth.status === 'authenticated' && auth.user) {
      router.navigate({ to: target, replace: true })
    }
  }, [auth.status, auth.user, router, target])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const { user } = await loginWithEmail({
        data: {
          email: email.trim(),
          password,
        },
      })
      auth.setUser(user)
      router.navigate({ to: target })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Login failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.25),transparent_50%)] bg-slate-950 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center space-y-2">
          <p className="text-cyan-300 tracking-[0.4em] text-xs uppercase">Trailbase Auth</p>
          <h1 className="text-4xl font-black text-white">Sign in</h1>
          <p className="text-sm text-slate-300">
            Use your Trailbase email and password to access the dashboard.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-900/70 border border-white/10 rounded-3xl p-8 shadow-[0_20px_80px_rgba(15,23,42,0.6)] space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-200 text-sm">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-200 text-sm">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 bg-linear-to-r from-cyan-400 via-blue-500 to-indigo-500 text-slate-950 font-semibold shadow-lg shadow-cyan-900/50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>

          <p className="text-center text-xs text-slate-500">
            After signing in you will be redirected to{' '}
            <span className="font-semibold text-slate-300">{target}</span>.
          </p>
        </form>
      </div>
    </div>
  )
}
