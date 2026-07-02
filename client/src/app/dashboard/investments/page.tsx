'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { TrendingUp, Check, Zap, Shield, Clock } from 'lucide-react'

type InvestmentStatus = 'PENDING' | 'PAYMENT_RECEIVED' | 'ACTIVE_TRADE' | 'CLOSED' | 'WITHDRAWN'

type PendingPayment = {
  depositId: string | null
  ecocashNumber: string | null
  ecocashAccountName: string | null
  ecocashReference: string | null
}

export default function InvestmentsPage() {
  const [view, setView] = useState<'packages' | 'history' | 'form' | 'pending'>('packages')
  const [plans, setPlans] = useState<any[]>([])
  const [investments, setInvestments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null)
  const [formData, setFormData] = useState({ amount: '', paymentMethod: 'ECOCASH', planId: '' })
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null)
  const [eventSource, setEventSource] = useState<EventSource | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const toastShownRef = useRef({ details: false, approved: false })

  useEffect(() => {
    fetchPlans()
    fetchInvestments()
    checkPendingDeposit()
  }, [])

  const fetchPlans = async () => {
    try {
      const { data } = await api.get('investments/plans')
      setPlans(data.data)
    } catch (err: any) {
      console.error('Failed to load plans:', err.response?.data || err.message)
      toast.error('Failed to load packages: ' + (err.response?.data?.message || err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const fetchInvestments = async () => {
    try {
      const { data } = await api.get('investments')
      setInvestments(data.data)
    } catch (err) {
      console.log(err)
    }
  }

  const checkPendingDeposit = async () => {
    try {
      const { data } = await api.get('deposits')
      const latest = data.data?.[0]
      if (latest && (latest.status === 'WAITING_FOR_PAYMENT_DETAILS' || latest.status === 'PAYMENT_DETAILS_SENT' || latest.status === 'PAYMENT_SUBMITTED')) {
        setPendingPayment({
          depositId: latest.id,
          ecocashNumber: latest.ecocash_number,
          ecocashAccountName: latest.ecocash_account_name,
          ecocashReference: latest.ecocash_reference,
        })
        setView('pending')
        setupSSE()
      }
    } catch (err) {
      console.error('Check pending error:', err)
    }
  }

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan)
    setFormData({ amount: String(plan.min_amount), paymentMethod: 'ECOCASH', planId: plan.id })
    setView('form')
  }

  const handleInvestmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    toastShownRef.current = { details: false, approved: false }
    try {
      const { data } = await api.post('investments', {
        ...formData,
        amount: Number(formData.amount),
      })
      const { investment, depositId } = data.data
      
      setPendingPayment({
        depositId: depositId,
        ecocashNumber: null,
        ecocashAccountName: null,
        ecocashReference: null,
      })
      
      setupSSE()
      
      toast.success('Investment request submitted! Waiting for payment details...')
      setView('pending')
      fetchInvestments()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed')
    }
  }

  const setupSSE = () => {
    const token = localStorage.getItem('token')
    if (!token) return
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
    const baseUrl = apiUrl.replace(/\/api$/, '').replace(/\/api$/, '')
    const sseUrl = `${baseUrl}/sse/payment-updates?token=${token}`
    console.log('Setting up SSE connection:', sseUrl)
    const source = new EventSource(sseUrl)
    source.onopen = () => console.log('SSE connected')
    source.onerror = (e) => console.error('SSE error:', e)
    source.onmessage = (e) => {
      console.log('SSE message received:', e.data)
      const data = JSON.parse(e.data)
      if (data.type === 'payment_details' && !toastShownRef.current.details) {
        toastShownRef.current.details = true
        setPendingPayment((prev) => prev ? {
          ...prev,
          ecocashNumber: data.ecocashNumber,
          ecocashAccountName: data.ecocashAccountName,
          ecocashReference: data.ecocashReference,
        } : null)
        toast.success('Payment details received!')
      }
      if (data.type === 'payment_approved' && !toastShownRef.current.approved) {
        toastShownRef.current.approved = true
        toast.success('Payment approved! Your investment is now active.')
        setView('packages')
        fetchInvestments()
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      }
    }
    setEventSource(source)
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const { data } = await api.get('deposits')
        const latest = data.data?.[0]
        if (latest?.ecocash_number && !pendingPayment?.ecocashNumber) {
          setPendingPayment({
            depositId: latest.id,
            ecocashNumber: latest.ecocash_number,
            ecocashAccountName: latest.ecocash_account_name,
            ecocashReference: latest.ecocash_reference,
          })
          if (!toastShownRef.current.details) {
            toastShownRef.current.details = true
            toast.success('Payment details received!')
          }
        }
        if (latest?.status === 'PAYMENT_RECEIVED' && pendingPayment?.depositId) {
          if (!toastShownRef.current.approved) {
            toastShownRef.current.approved = true
            toast.success('Payment approved! Your investment is now active.')
          }
          setView('packages')
          fetchInvestments()
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 5000)
  }

  useEffect(() => {
    return () => {
      if (eventSource) eventSource.close()
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [eventSource])

  const statusColors: Record<InvestmentStatus, string> = {
    PENDING: 'bg-gray-100 text-gray-800 border border-gray-200',
    PAYMENT_RECEIVED: 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20',
    ACTIVE_TRADE: 'bg-green-100 text-green-800 border border-green-200',
    CLOSED: 'bg-purple-100 text-purple-800 border border-purple-200',
    WITHDRAWN: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  }

  const getBrandGradient = (index: number) => {
    const gradients = [
      'from-brand-blue to-brand-sky',
      'from-brand-sky to-brand-blue',
      'from-brand-blue to-brand-light',
      'from-brand-light to-brand-blue',
      'from-brand-sky to-brand-light',
    ]
    return gradients[index % gradients.length] || gradients[0]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Investments</h1>
        <div className="flex gap-2">
            <button
              onClick={() => setView('packages')}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${view === 'packages' ? 'bg-gradient-to-r from-brand-blue to-brand-sky text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Packages
            </button>
            <button
              onClick={() => setView('history')}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${view === 'history' ? 'bg-gradient-to-r from-brand-blue to-brand-sky text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              My Investments
            </button>
        </div>
      </div>

      {view === 'packages' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-r from-brand-blue to-brand-sky p-6 text-white shadow-xl">
            <h2 className="text-xl font-bold">EcoCash Investment Platform</h2>
            <p className="mt-2 text-white/90">
              Our advanced mining technology locks in all incoming profits and maintains stable trade signals,
              protecting your investment from negative market volatility.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>6 Hour Trade Cycle</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span>Guaranteed Returns</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Market Protection</span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan, idx) => {
              const isPopular = plan.slug === 'professional'
              const minAmt = Number(plan.min_amount) || 0
              const profitReturn = minAmt * (plan.return_multiplier || 1)
              return (
                <div
                  key={plan.id}
                  onClick={() => handleSelectPlan(plan)}
                  className={`relative cursor-pointer rounded-2xl border-2 bg-white p-6 shadow-lg transition-all hover:shadow-xl ${
                    isPopular ? 'border-brand-blue/20 ring-2 ring-brand-blue/10' : 'border-gray-100 hover:border-brand-blue/20'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-gradient-to-r from-brand-blue to-brand-sky px-3 py-1 text-xs font-semibold text-white">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center">
                    <div className={`mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${getBrandGradient(idx)} text-white shadow-lg`}>
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                    <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
                  </div>

                  <div className="mt-5 space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Investment</span>
                      <span className="font-semibold text-gray-900">${minAmt.toFixed(2)}{plan.max_amount ? ` - $${Number(plan.max_amount).toFixed(2)}` : '+'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Your Profit</span>
                      <span className="font-semibold text-brand-blue">${profitReturn.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Duration</span>
                      <span className="font-semibold text-gray-900">{plan.trade_duration_hours}h</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Return</span>
                      <span className="font-bold text-brand-blue">{plan.return_multiplier}x</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      <span>Auto-profit locking system</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      <span>Stable trade signal protection</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      <span>Market volatility shield</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      <span>Instant payout after trade</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectPlan(plan)
                    }}
                    className="mt-5 w-full rounded-xl bg-gradient-to-r from-brand-blue to-brand-sky py-2.5 text-sm font-semibold text-white hover:from-brand-blue/90 hover:to-brand-sky/90 transition-all"
                  >
                    Invest Now
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {view === 'form' && selectedPlan && (
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Complete Your Investment</h3>
            <button onClick={() => setView('packages')} className="text-sm text-gray-500 hover:text-gray-700">
              ← Back to packages
            </button>
          </div>

          <div className="mb-5 rounded-xl bg-gradient-to-r from-brand-blue/10 to-brand-sky/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Selected Package</p>
                <p className="text-base font-bold text-gray-900">{selectedPlan.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">Expected Profit</p>
                <p className="text-base font-bold text-brand-blue">
                  ${(Number(selectedPlan.min_amount) * Number(selectedPlan.return_multiplier)).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleInvestmentSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Investment Amount (USD)</label>
                <input
                  type="number"
                  min={selectedPlan.min_amount}
                  max={selectedPlan.max_amount || undefined}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
                  placeholder={`Min $${Number(selectedPlan.min_amount).toFixed(2)}`}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <input
                  type="text"
                  value="EcoCash"
                  disabled
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-700"
                />
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
              <p><strong>How it works:</strong> EcoCash will trade on your behalf for {selectedPlan.trade_duration_hours} hours. After the trade closes, you receive {selectedPlan.return_multiplier}x your investment as profit.</p>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="rounded-xl bg-gradient-to-r from-brand-blue to-brand-sky px-5 py-2 text-sm font-medium text-white hover:from-brand-blue/90 hover:to-brand-sky/90 transition-all">
                Submit Request
              </button>
              <button type="button" onClick={() => setView('packages')} className="rounded-xl border border-gray-200 px-5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {view === 'pending' && pendingPayment && (
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {pendingPayment.ecocashNumber ? 'Payment Details Received!' : 'Waiting for Payment Details'}
            </h3>
            {!pendingPayment.ecocashNumber && (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
            )}
          </div>
          
          <p className="text-sm text-gray-600">Your investment request has been submitted. Payment details will be sent shortly.</p>
          
          {pendingPayment.ecocashNumber && (
            <div className="rounded-xl bg-green-50 p-4 mt-4 space-y-2">
              <div>
                <span className="text-xs text-gray-600">EcoCash Number:</span>
                <p className="font-mono font-semibold text-gray-900">{pendingPayment.ecocashNumber}</p>
              </div>
              <div>
                <span className="text-xs text-gray-600">Account Name:</span>
                <p className="font-semibold text-gray-900">{pendingPayment.ecocashAccountName}</p>
              </div>
              {pendingPayment.ecocashReference && (
                <div>
                  <span className="text-xs text-gray-600">Reference:</span>
                  <p className="font-semibold text-gray-900">{pendingPayment.ecocashReference}</p>
                </div>
              )}
              <div className="mt-4 space-y-2">
                <input
                  type="file"
                  id="receipt-upload"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const form = new FormData()
                      form.append('receipt', file)
                      try {
                        await api.post(`deposits/${pendingPayment.depositId}/upload-receipt`, form)
                        toast.success('Payment proof submitted!')
                        setView('packages')
                        fetchInvestments()
                      } catch (err: any) {
                        console.error('Upload error:', err)
                        toast.error(err.response?.data?.message || 'Failed to upload proof')
                      }
                    }
                  }}
                />
                <label
                  htmlFor="receipt-upload"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-sky px-4 py-2 text-sm font-medium text-white hover:from-brand-blue/90 hover:to-brand-sky/90 cursor-pointer transition-all"
                >
                  Have you paid? &gt; Upload Payment Proof
                </label>
                <button
                  onClick={() => setView('packages')}
                  className="ml-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {!pendingPayment.ecocashNumber && (
            <div className="rounded-xl bg-yellow-50 p-4 mt-4">
              <p className="text-sm text-yellow-800">Waiting for payment details...</p>
            </div>
          )}
        </div>
      )}

      {view === 'history' && (
        <div className="overflow-x-auto rounded-3xl border bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="border-b text-left text-sm font-medium text-gray-600">
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Balance</th>
                <th className="px-5 py-3">Profit</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {investments.map((inv) => {
                const plan = inv.plan || {}
                const minAmt = plan.min_amount
                const profitReturn = minAmt ? minAmt * (plan.return_multiplier || 1) : inv.deposit_amount || 0
                return (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{inv.investment_id}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{plan.name || '-'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">${Number(inv.deposit_amount || 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">${Number(inv.current_balance || 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">+${Number(profitReturn).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[inv.status as InvestmentStatus]}`}>
                      {inv.status?.replace(/_/g, ' ') || '-'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{new Date(inv.created_at).toLocaleDateString()}</td>
                </tr>
                )
              })}
            </tbody>
          </table>
          {investments.length === 0 && <div className="p-8 text-center text-gray-500">No investments yet. Choose a package to get started!</div>}
        </div>
      )}
    </div>
  )
}