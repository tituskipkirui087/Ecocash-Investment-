'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { Wallet, ArrowUpRight, Landmark, Hash } from 'lucide-react'
import { ConfirmModal } from '@/components/ConfirmModal'
import { SuccessModal } from '@/components/SuccessModal'

type WithdrawalStatus = 'WITHDRAWAL_PENDING' | 'WITHDRAWN' | 'REJECTED'
const WITHDRAWAL_FEE_PERCENT = 0.02
const WITHDRAWAL_FEE_MIN = 1
const WITHDRAWAL_FEE_MAX = 5

const getWithdrawalFee = (amount: number): number => {
  const fee = amount * WITHDRAWAL_FEE_PERCENT
  return Math.max(WITHDRAWAL_FEE_MIN, Math.min(WITHDRAWAL_FEE_MAX, fee))
}

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [investments, setInvestments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'withdraw' | 'invest' | null>(null)
  const [availableBalance, setAvailableBalance] = useState(0)
  const [formData, setFormData] = useState({ investmentId: '', amount: '', method: 'ECOCASH', ecocashNumber: '', walletAddress: '' })
  const router = useRouter()

  useEffect(() => {
    fetchWithdrawals()
  }, [])

  const fetchWithdrawals = async () => {
    try {
        const { data } = await api.get('withdrawals')
      setWithdrawals(data.data)
    } catch (err) {
      toast.error('Failed to fetch withdrawals')
    } finally {
      setLoading(false)
    }
  }

  const fetchInvestments = async () => {
    try {
      const { data } = await api.get('/investments')
      setInvestments(data.data)
      const active = data.data.filter((inv: any) => 
        inv.status === 'PAYMENT_RECEIVED' || inv.status === 'ACTIVE_TRADE'
      )
      const total = active.reduce((sum: number, inv: any) => sum + Number(inv.currentBalance), 0)
      setAvailableBalance(total)
    } catch (err) {
      console.log(err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(formData.amount)
    if (amount < 1) {
      toast.error('Amount must be at least $1')
      return
    }
    const fee = getWithdrawalFee(amount)
    const maxWithdrawable = availableBalance - fee
    if (amount > maxWithdrawable) {
      toast.error(`Insufficient balance. Fee: $${fee.toFixed(2)}`)
      return
    }
    setConfirmAction('withdraw')
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
      }
      await api.post('withdrawals', payload)
      setShowForm(false)
      setShowConfirm(false)
      setConfirmAction(null)
      setShowSuccess(true)
      fetchWithdrawals()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed')
      setShowConfirm(false)
      setConfirmAction(null)
    }
  }

  const statusColors: Record<WithdrawalStatus, string> = {
    WITHDRAWAL_PENDING: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    WITHDRAWN: 'bg-green-50 text-green-700 border border-green-200',
    REJECTED: 'bg-red-50 text-red-700 border border-red-200',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Withdrawals</h1>
        <button
          onClick={() => {
            fetchInvestments()
            setShowForm(!showForm)
          }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-sky px-4 py-2 text-sm font-medium text-white hover:from-brand-blue/90 hover:to-brand-sky/90 transition-all duration-200"
        >
          <ArrowUpRight size={18} />
          New Withdrawal
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-3xl border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Withdrawal</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Investment</label>
              <select
                value={formData.investmentId}
                onChange={(e) => setFormData({ ...formData, investmentId: e.target.value })}
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
                required
              >
                <option value="">Select investment</option>
                {investments.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.investmentId} - ${Number(inv.currentBalance).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount (USD)</label>
              <input
                type="number"
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
                required
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Method</label>
              <select
                value={formData.method}
                onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
              >
                <option value="ECOCASH">EcoCash</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">EcoCash Number</label>
              <div className="relative mt-1">
                <Landmark className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.ecocashNumber}
                  onChange={(e) => setFormData({ ...formData, ecocashNumber: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 pl-10 pr-3 py-2.5 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
                  required
                  placeholder="+263..."
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="submit" className="rounded-xl bg-gradient-to-r from-brand-blue to-brand-sky px-5 py-2 text-sm font-medium text-white hover:from-brand-blue/90 hover:to-brand-sky/90 transition-all duration-200">
              Submit
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-gray-200 px-5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-all duration-200">
              Cancel
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Available: ${availableBalance.toLocaleString()} | Fee: {formData.amount ? `$${getWithdrawalFee(Number(formData.amount)).toFixed(2)}` : '-'} (2%, min $1, max $5)
          </p>
        </form>
      )}

      <ConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        onCancel={() => router.push('/dashboard/investments')}
        title="Confirm Withdrawal"
        message={`Withdraw $${formData.amount}? Fee: $${getWithdrawalFee(Number(formData.amount)).toFixed(2)}. Total deduction: $${(Number(formData.amount) + getWithdrawalFee(Number(formData.amount))).toFixed(2)}`}
        confirmLabel="Withdraw"
        cancelLabel="Make New Investment"
      />

      <SuccessModal open={showSuccess} onClose={() => setShowSuccess(false)} amount={formData.amount} />

      <div className="rounded-3xl border bg-white overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="border-b text-left text-sm font-medium text-gray-600">
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Investment</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Method</th>
              <th className="px-5 py-3">Details</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {withdrawals.map((w) => (
              <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 text-sm text-gray-600">{new Date(w.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-3 text-sm text-gray-900 font-medium">{w.investmentId}</td>
                <td className="px-5 py-3 text-sm font-medium text-gray-900">${Number(w.amount).toLocaleString()}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{w.method}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{w.ecocashNumber || w.walletAddress || '-'}</td>
                <td className="px-5 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[w.status as WithdrawalStatus]}`}>
                    {w.status.replace(/_/g, ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {withdrawals.length === 0 && <div className="p-8 text-center text-gray-500">No withdrawals yet.</div>}
      </div>
    </div>
  )
}