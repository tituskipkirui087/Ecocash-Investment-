'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { User, Calendar, MapPin, CreditCard, Camera, Send, Flag, Shield, CheckCircle } from 'lucide-react'

type DocumentType = 'PASSPORT' | 'NATIONAL_ID' | 'DRIVERS_LICENSE' | 'RESIDENCE_PERMIT'

export default function KYCPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullNameLegal: '',
    dateOfBirth: '',
    residentialAddress: '',
    country: 'Zimbabwe',
    idDocumentType: '' as DocumentType,
  })
  const [idDocument, setIdDocument] = useState<File | null>(null)
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showCamera, setShowCamera] = useState(false)

  useEffect(() => {
    if (showCamera && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) videoRef.current.srcObject = stream
        })
        .catch(err => {
          console.error('Camera error:', err)
          toast.error('Could not access camera')
        })
    }
  }, [showCamera])

  const captureSelfie = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(videoRef.current, 0, 0)
      canvas.toBlob(blob => {
        if (blob) {
          const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' })
          setSelfiePreview(URL.createObjectURL(file))
          const stream = videoRef.current?.srcObject as MediaStream
          stream?.getTracks().forEach(t => t.stop())
          setShowCamera(false)
        }
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!idDocument || !selfiePreview) {
      toast.error('Please upload ID document and capture selfie')
      return
    }
    setLoading(true)
    try {
      const form = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        if (value) form.append(key, value as string)
      })
      form.append('idDocument', idDocument)
      const selfieRes = await fetch(selfiePreview)
      const selfieBlob = await selfieRes.blob()
      form.append('selfie', new File([selfieBlob], 'selfie.jpg', { type: 'image/jpeg' }))

      await api.post('auth/kyc', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('KYC submitted successfully! Redirecting to dashboard...')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit KYC')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-brand-blue/5 to-brand-blue/10 p-4">
      <div className="w-full max-w-2xl">
        <div className="rounded-3xl bg-white p-8 shadow-xl border border-gray-100">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-blue to-brand-sky">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Complete Your KYC</h1>
            <p className="mt-2 text-gray-600">Verify your identity to access your account</p>
            <p className="mt-1 text-xs text-gray-500">Your information is securely encrypted and protected</p>
          </div>

          {showCamera && (
            <div className="mb-6 rounded-2xl overflow-hidden border-2 border-brand-blue/20 bg-black shadow-lg">
              <div className="relative">
                <video ref={videoRef} autoPlay playsInline className="w-full" />
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-3">
                  <p className="text-xs text-white font-medium">Ensure your face is well-lit and centered</p>
                  <p className="text-xs text-white/80">Remove sunglasses and look directly at the camera</p>
                </div>
              </div>
              <div className="p-4 bg-gray-900 flex justify-between items-center">
                <button type="button" onClick={() => setShowCamera(false)} className="px-4 py-2 text-sm border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800">Cancel</button>
                <button type="button" onClick={captureSelfie} className="px-6 py-2 text-sm bg-brand-blue text-white rounded-lg font-medium flex items-center gap-2 hover:bg-brand-blue/90"><Camera className="h-4 w-4" /> Capture Selfie</button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Legal Name</label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.fullNameLegal}
                  onChange={(e) => setFormData({ ...formData, fullNameLegal: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 pl-10 pr-3 py-2.5 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
                  required
                  placeholder="As it appears on your ID"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 pl-10 pr-3 py-2.5 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Residential Address</label>
              <div className="relative mt-1">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <textarea
                  value={formData.residentialAddress}
                  onChange={(e) => setFormData({ ...formData, residentialAddress: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 pl-10 pr-3 py-2.5 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
                  rows={2}
                  required
                  placeholder="Your full residential address"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <div className="relative">
                <Flag className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 pl-10 pr-3 py-2.5 bg-gray-50 cursor-not-allowed"
                  disabled
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ID Document Type</label>
              <select
                value={formData.idDocumentType}
                onChange={(e) => setFormData({ ...formData, idDocumentType: e.target.value as DocumentType })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
                required
              >
                <option value="">Select document type</option>
                <option value="PASSPORT">Passport</option>
                <option value="NATIONAL_ID">National ID Card</option>
                <option value="DRIVERS_LICENSE">Driver's License</option>
                <option value="RESIDENCE_PERMIT">Residence Permit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload ID Document</label>
              <label className="flex items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 px-4 py-3 cursor-pointer hover:border-brand-blue/30 bg-gray-50/50">
                <CreditCard className="h-5 w-5 text-brand-blue" />
                <span className="text-sm text-gray-600 truncate flex-1">{idDocument ? idDocument.name : 'Click to choose file'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setIdDocument(e.target.files?.[0] || null)}
                  className="hidden"
                  required
                />
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Capture Selfie</label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-sky px-4 py-2.5 text-sm font-medium text-white hover:from-brand-blue/90 hover:to-brand-sky/90"
                >
                  <Camera className="h-4 w-4" />
                  Open Camera
                </button>
                {selfiePreview && (
                  <div className="relative">
                    <img src={selfiePreview} alt="Selfie preview" className="h-14 w-14 rounded-full object-cover border-2 border-brand-blue/20" />
                    <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-sky px-4 py-2.5 text-sm font-medium text-white hover:from-brand-blue/90 hover:to-brand-sky/90 disabled:opacity-50 transition-all duration-200"
            >
              <Send size={18} />
              {loading ? 'Submitting...' : 'Submit for Verification'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}