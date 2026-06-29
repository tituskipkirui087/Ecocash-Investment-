'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type DepositStatus = 'WAITING_FOR_PAYMENT_DETAILS' | 'PAYMENT_DETAILS_SENT' | 'PAYMENT_SUBMITTED' | 'PAYMENT_RECEIVED' | 'REJECTED'

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDeposits()
  }, [])

  const fetchDeposits = async () => {
    try {
        const { data } = await api.get('deposits')
      setDeposits(data.data)
    } catch (err) {
      toast.error('Failed to fetch deposits')
    } finally {
      setLoading(false)
    }
  }

  const statusColors: Record<DepositStatus, string> = {
    WAITING_FOR_PAYMENT_DETAILS: 'bg-gray-100 text-gray-800 border border-gray-200',
    PAYMENT_DETAILS_SENT: 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20',
    PAYMENT_SUBMITTED: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    PAYMENT_RECEIVED: 'bg-green-100 text-green-800 border border-green-200',
    REJECTED: 'bg-red-100 text-red-800 border border-red-200',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>

      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">EcoCash Instructions</h3>
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Minimum Amount: <span className="font-bold text-brand-blue">$100</span></p>
          <p className="text-sm text-gray-600">Please wait for EcoCash payment details from the administrator after submitting your investment request.</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="border-b text-left text-sm font-medium text-gray-600">
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">EcoCash Details</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {deposits.map((dep: any) => (
              <tr key={dep.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 text-sm text-gray-600">{new Date(dep.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-3 text-sm font-medium text-gray-900">${Number(dep.amount).toLocaleString()}</td>
                <td className="px-5 py-3 text-sm text-gray-600">
                  {dep.ecocashNumber ? (
                    <div>
                      <p className="font-medium">{dep.ecocashNumber}</p>
                      <p className="text-xs text-gray-500">{dep.ecocashAccountName}</p>
                      {dep.ecocashReference && <p className="text-xs text-gray-500">Ref: {dep.ecocashReference}</p>}
                    </div>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[dep.status as DepositStatus]}`}>
                    {dep.status.replace(/_/g, ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {deposits.length === 0 && <div className="p-8 text-center text-gray-500">No deposits yet.</div>}
      </div>
    </div>
  )
}