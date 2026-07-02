'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { Eye, EyeOff, LogIn } from 'lucide-react'

function LoginForm() {
  const searchParams = useSearchParams()
  const urlEmail = searchParams.get('email') || ''
  const initialName = searchParams.get('name') || ''
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { login } = useAuth()

  useEffect(() => {
    const savedEmail = localStorage.getItem('lastEmail')
    if (savedEmail && !urlEmail) {
      setEmail(savedEmail)
    } else if (urlEmail) {
      setEmail(urlEmail)
    }
  }, [urlEmail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    localStorage.setItem('lastEmail', email)

    try {
      const { data } = await api.post('auth/login', { email, password })
      // Map snake_case to camelCase for frontend
      const userData = data.data.user
      const mappedUser = {
        ...userData,
        firstName: userData.first_name,
        lastName: userData.last_name,
        kycStatus: userData.kyc_status,
        phone: userData.phone,
      }
      login(data.data.token, mappedUser)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-brand-blue/5 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white p-8 shadow-xl border border-gray-100">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-blue to-brand-sky">
              <LogIn className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
            {initialName && (
              <p className="mt-2 text-lg font-medium text-brand-blue">Hi, {initialName}</p>
            )}
            {!initialName && (
              <p className="mt-2 text-gray-600">Sign in to your account</p>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-100">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <div className="relative mt-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
                  required
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-sky px-4 py-2.5 font-medium text-white hover:from-brand-blue/90 hover:to-brand-sky/90 disabled:opacity-50 transition-all duration-200"
            >
              <LogIn size={18} />
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-brand-blue hover:underline">
              Register Now
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-brand-blue/5 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white p-8 shadow-xl border border-gray-100">
          <div className="flex items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-blue border-t-transparent" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginForm />
    </Suspense>
  )
}