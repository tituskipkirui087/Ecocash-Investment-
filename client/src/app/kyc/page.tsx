'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { User, Calendar, MapPin, CreditCard, Camera, Send, Shield, CheckCircle, FileText, X } from 'lucide-react'

type DocumentType = 'PASSPORT' | 'NATIONAL_ID' | 'DRIVERS_LICENSE' | 'RESIDENCE_PERMIT'

const ZIMBABWE_LOCATIONS = [
  'Harare', 'Bulawayo', 'Chitungwiza', 'Mutare', 'Gweru', 'Kwekwe', 'Kadoma', 'Masvingo', 'Chinhoyi', 'Karoi',
  'Norton', 'Chegutu', 'Rusape', 'Nyanga', 'Marondera', 'Murehwa', 'Uzumba', 'Mudzi', 'Hwange', 'Victoria Falls',
  'Beitbridge', 'Plumtree', 'Gwanda', 'Esigodini', 'Kezi', 'Maphisa', 'Filabusi', 'Lupane', 'Nkayi', 'Tsholotsho'
]

export default function KYCPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullNameLegal: '',
    dateOfBirth: '',
    residentialAddress: '',
    country: 'Zimbabwe',
    idDocumentType: '' as DocumentType,
    idDocumentNumber: '',
  })
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null)
  const [idFrontName, setIdFrontName] = useState('')
  const [idBackFile, setIdBackFile] = useState<File | null>(null)
  const [idBackName, setIdBackName] = useState('')
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null)
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showCamera, setShowCamera] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (showCamera && videoRef.current && !streamRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          streamRef.current = stream
          if (videoRef.current) videoRef.current.srcObject = stream
        })
        .catch(err => {
          console.error('Camera error:', err)
          toast.error('Could not access camera')
        })
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [showCamera])

  const handleAddressChange = (value: string) => {
    setFormData({ ...formData, residentialAddress: value })
    if (value.length > 1) {
      const suggestions = ZIMBABWE_LOCATIONS.filter(loc => 
        loc.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5)
      setAddressSuggestions(suggestions)
      setShowSuggestions(suggestions.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

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
          setSelfieFile(file)
          setSelfiePreview(URL.createObjectURL(file))
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop())
            streamRef.current = null
          }
          setShowCamera(false)
          toast.success('Selfie captured!')
        }
      }, 'image/jpeg', 0.9)
    }
  }

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const form = new FormData()
      form.append('fullNameLegal', formData.fullNameLegal)
      form.append('dateOfBirth', formData.dateOfBirth)
      form.append('residentialAddress', formData.residentialAddress)
      form.append('country', formData.country)
      form.append('idDocumentType', formData.idDocumentType)
      form.append('idDocumentNumber', formData.idDocumentNumber)
      if (idFrontFile) form.append('idDocumentFront', idFrontFile)
      if (idBackFile) form.append('idDocumentBack', idBackFile)
      if (selfieFile) form.append('selfie', selfieFile)
      
      // Get token for authorization
      const token = localStorage.getItem('token')
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ecocash-investment-server.vercel.app/api'
      // Use fetch directly to avoid axios JSON content-type interference
      const response = await fetch(`${API_URL}/auth/kyc`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: form,
      })
      
      if (!response.ok) {
        let errorMessage = 'KYC submission failed'
        try {
          const error = await response.json()
          console.error('KYC error response:', error)
          errorMessage = error.message || 'KYC submission failed'
        } catch (parseErr) {
          console.error('Error parsing error response:', parseErr)
        }
        throw new Error(errorMessage)
      }
      
      toast.success('KYC submitted for verification! Admin will review shortly.')
      router.push('/dashboard')
    } catch (err: any) {
      console.error('KYC submit error:', err)
      if (err.message) console.error('Error message:', err.message)
      toast.error(err.response?.data?.message || err.message || 'Failed to submit KYC')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-brand-blue/5 to-brand-blue/10 p-4">
      <div className="w-full max-w-xl">
        <div className="rounded-3xl bg-white p-6 shadow-xl border border-gray-100">
          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue to-brand-sky">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Complete Your KYC</h1>
            <p className="mt-1 text-xs text-gray-600">Verify your identity to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Personal Info Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Full Legal Name</label>
                <div className="relative mt-1">
                  <User className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.fullNameLegal}
                    onChange={(e) => setFormData({ ...formData, fullNameLegal: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 pl-8 pr-2 py-2 text-xs focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue/10"
                    required
                    placeholder="As on your ID"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Date of Birth</label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 pl-8 pr-2 py-2 text-xs focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue/10"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Address with Suggestions */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-700">Residential Address</label>
              <div className="relative mt-1">
                <MapPin className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={formData.residentialAddress}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onFocus={() => formData.residentialAddress.length > 1 && setAddressSuggestions(ZIMBABWE_LOCATIONS.slice(0, 5))}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full rounded-lg border border-gray-200 pl-8 pr-2 py-2 text-xs focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue/10"
                  placeholder="Start typing location in Zimbabwe"
                  required
                />
              </div>
              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                  {addressSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, residentialAddress: suggestion })
                        setShowSuggestions(false)
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 border-b last:border-b-0"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ID Document Type */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ID Document Type</label>
              <select
                value={formData.idDocumentType}
                onChange={(e) => setFormData({ ...formData, idDocumentType: e.target.value as DocumentType })}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue/10"
                required
              >
                <option value="">Select document type</option>
                <option value="PASSPORT">Passport</option>
                <option value="NATIONAL_ID">National ID Card</option>
                <option value="DRIVERS_LICENSE">Driver's License</option>
                <option value="RESIDENCE_PERMIT">Residence Permit</option>
              </select>
            </div>

            {/* ID Number */}
            <div>
              <label className="block text-xs font-medium text-gray-700">ID Document Number</label>
              <div className="relative mt-1">
                <CreditCard className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={formData.idDocumentNumber}
                  onChange={(e) => setFormData({ ...formData, idDocumentNumber: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 pl-8 pr-2 py-2 text-xs focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue/10"
                  placeholder="ID number"
                  required
                />
              </div>
            </div>

            {/* ID Document Front/Back Upload */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Upload ID Documents (Front & Back)</label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col items-center gap-1 rounded-lg border-2 border-dashed border-gray-200 p-3 cursor-pointer hover:border-brand-blue/30">
                  <FileText className="h-4 w-4 text-brand-blue" />
                  <span className="text-2xs text-gray-600 text-center">Front Side</span>
                  {idFrontName && (
                    <span className="text-2xs text-green-600 font-medium truncate max-w-full">{idFrontName}</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setIdFrontFile(file)
                        setIdFrontName(file.name)
                      }
                    }}
                    className="hidden"
                    required
                  />
                </label>
                <label className="flex flex-col items-center gap-1 rounded-lg border-2 border-dashed border-gray-200 p-3 cursor-pointer hover:border-brand-blue/30">
                  <FileText className="h-4 w-4 text-brand-blue" />
                  <span className="text-2xs text-gray-600 text-center">Back Side</span>
                  {idBackName && (
                    <span className="text-2xs text-green-600 font-medium truncate max-w-full">{idBackName}</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setIdBackFile(file)
                        setIdBackName(file.name)
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Selfie Capture - Small Popup Window */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Capture Selfie</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-blue to-brand-sky px-3 py-1.5 text-xs font-medium text-white hover:from-brand-blue/90 hover:to-brand-sky/90"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Open Camera
                </button>
                
                {selfiePreview && (
                  <div className="relative">
                    <img src={selfiePreview} alt="Selfie" className="h-10 w-10 rounded-full object-cover border-2 border-brand-blue/20" />
                    <div className="absolute -top-0.5 -right-0.5 bg-green-500 rounded-full p-0.5">
                      <CheckCircle className="h-2.5 w-2.5 text-white" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-blue to-brand-sky px-3 py-2 text-xs font-medium text-white hover:from-brand-blue/90 hover:to-brand-sky/90 disabled:opacity-50 transition-all"
            >
              <Send size={16} />
              {loading ? 'Submitting...' : 'Submit for Verification'}
            </button>
          </form>
        </div>
      </div>
      
      {/* Small Camera Popup */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-80 max-w-full rounded-xl overflow-hidden border-2 border-brand-blue/20 bg-black shadow-2xl">
            <button
              type="button"
              onClick={() => { setShowCamera(false); if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null } }}
              className="absolute top-2 right-2 z-10 text-white hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
            <video ref={videoRef} autoPlay playsInline className="w-full" style={{ maxHeight: '280px' }} />
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-2">
              <p className="text-2xs text-white font-medium">Ensure your face is well-lit and centered</p>
              <p className="text-2xs text-white/80">Look directly at the camera</p>
            </div>
            <div className="p-3 bg-gray-900 flex justify-end">
              <button type="button" onClick={captureSelfie} className="px-4 py-1 text-xs bg-brand-blue text-white rounded font-medium flex items-center gap-1"><Camera className="h-3.5 w-3.5" /> Capture</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}