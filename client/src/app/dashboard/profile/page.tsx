'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { Mail, Phone, Save, Camera, LogOut, Shield, User as UserIcon } from 'lucide-react'

export default function ProfilePage() {
  const { user, token, logout, updateUser } = useAuth()
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: (user as any)?.phone || '',
  })
  const [loading, setLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [showKycConfirmed, setShowKycConfirmed] = useState(false)

  useEffect(() => {
    if (user?.avatar) {
      setAvatarPreview(user.avatar)
    }
  }, [user?.avatar])

  useEffect(() => {
    // Show KYC confirmation when user becomes verified
    if (user?.isVerified && !showKycConfirmed) {
      setShowKycConfirmed(true)
      toast.success('🎉 KYC Verified! Your account is now fully activated.', {
        duration: 5000,
        position: 'top-center',
      })
    }
  }, [user?.isVerified, showKycConfirmed])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string)
        setAvatarFile(file)
        uploadAvatar(file)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async (file: File) => {
    try {
      const form = new FormData()
      form.append('avatar', file)
      const { data } = await api.post('auth/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const storedUser = localStorage.getItem('user')
      if (storedUser && data.data?.avatar) {
        const parsed = JSON.parse(storedUser)
        parsed.avatar = data.data.avatar
        localStorage.setItem('user', JSON.stringify(parsed))
        localStorage.setItem('authUser', JSON.stringify(parsed))
        updateUser(parsed)
      }
      toast.success('Profile image updated')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload image')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.put('auth/profile', formData)
      toast.success('Profile updated successfully')
      updateUser({ ...user, ...formData } as any)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        Profile Settings
        {user?.isVerified && (
          <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full animate-pulse">
            <Shield className="h-3 w-3" />
            KYC Verified
          </span>
        )}
      </h1>

      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-brand-blue to-brand-sky flex items-center justify-center text-white text-xl font-bold overflow-hidden">
              {avatarPreview || user?.avatar ? (
                <img src={avatarPreview || user?.avatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 rounded-full bg-white p-1.5 shadow cursor-pointer hover:bg-gray-50 border border-gray-200">
              <Camera className="h-3.5 w-3.5 text-brand-blue" />
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-sm text-gray-600">{user?.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${user?.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-brand-blue/10 text-brand-blue'}`}>
                {user?.role}
              </span>
              {user?.isVerified && (
                <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  <Shield className="h-3 w-3" />
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <div className="relative mt-1">
                <UserIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 pl-10 pr-3 py-2.5 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <div className="relative mt-1">
                <UserIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 pl-10 pr-3 py-2.5 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-3 py-2.5 text-gray-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-xl border border-gray-200 pl-10 pr-3 py-2.5 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
                placeholder="+263..."
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-sky px-5 py-2.5 text-sm font-medium text-white hover:from-brand-blue/90 hover:to-brand-sky/90 disabled:opacity-50 transition-all duration-200"
          >
            <Save size={18} />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-xl border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </form>
      </div>
    </div>
  )
}