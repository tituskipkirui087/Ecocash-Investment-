'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Zap, TrendingDown } from 'lucide-react'

export default function DashboardPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalDeposited: 0,
    activeInvestments: 0,
    currentBalance: 0,
    totalProfit: 0,
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [requestingProfit, setRequestingProfit] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('investments')
        const userInvestments = data.data || []
        const activeInvestments = userInvestments.filter((inv: any) => 
          inv.status === 'PAYMENT_RECEIVED' || inv.status === 'ACTIVE_TRADE'
        )
        const activeCount = activeInvestments.length
        const totalDeposited = activeInvestments.reduce((sum: number, inv: any) => sum + Number(inv.depositAmount), 0)
        const totalProfit = activeInvestments.reduce((sum: number, inv: any) => sum + Number(inv.profitAmount || 0), 0)
        
        setStats({
          totalDeposited,
          activeInvestments: activeCount,
          currentBalance: activeInvestments.reduce((sum: number, inv: any) => sum + Number(inv.currentBalance), 0),
          totalProfit,
        })
      } catch (err) {
        console.error(err)
      }
    }
    if (token) fetchStats()
  }, [token])

  useEffect(() => {
    const source = new EventSource(`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/api/sse/payment-updates?token=${token}`)
    eventSourceRef.current = source
    source.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'trade_started' || data.type === 'payment_approved') {
        toast.success('Your investment status updated!')
        api.get('investments').then(res => {
          const userInvestments = res.data.data || []
          const activeInvestments = userInvestments.filter((inv: any) => 
            inv.status === 'PAYMENT_RECEIVED' || inv.status === 'ACTIVE_TRADE'
          )
          const activeCount = activeInvestments.length
          setStats({
            totalDeposited: activeInvestments.reduce((sum: number, inv: any) => sum + Number(inv.depositAmount), 0),
            activeInvestments: activeCount,
            currentBalance: activeInvestments.reduce((sum: number, inv: any) => sum + Number(inv.currentBalance), 0),
            totalProfit: activeInvestments.reduce((sum: number, inv: any) => sum + Number(inv.profitAmount || 0), 0),
          })
        }).catch(() => {})
      }
      if (data.type === 'profit_updated') {
        const profitMsg = data.profitAmount >= 0 
          ? `You have made $${Number(data.profitAmount).toLocaleString()} profits so far! Kindly be patient until the 6hr period is over then track again.`
          : `Loss of $${Math.abs(Number(data.profitAmount)).toLocaleString()} recorded. Click to see details.`
        toast.success(profitMsg)
        api.get('investments').then(res => {
          const userInvestments = res.data.data || []
          const activeInvestments = userInvestments.filter((inv: any) => 
            inv.status === 'PAYMENT_RECEIVED' || inv.status === 'ACTIVE_TRADE'
          )
          setStats({
            totalDeposited: activeInvestments.reduce((sum: number, inv: any) => sum + Number(inv.depositAmount), 0),
            activeInvestments: activeInvestments.length,
            currentBalance: activeInvestments.reduce((sum: number, inv: any) => sum + Number(inv.currentBalance), 0),
            totalProfit: activeInvestments.reduce((sum: number, inv: any) => sum + Number(inv.profitAmount || 0), 0),
          })
        }).catch(() => {})
      }
    }
    return () => source.close()
  }, [token])

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const [invRes, depRes] = await Promise.all([
          api.get('investments'),
          api.get('deposits'),
        ])
        const investments = (invRes.data.data || []).slice(0, 3).map((inv: any) => ({
          type: 'investment',
          id: inv.investmentId,
          plan: inv.plan?.name || 'Plan',
          amount: inv.depositAmount,
          status: inv.status,
          date: inv.createdAt,
        }))
        const deposits = (depRes.data.data || []).slice(0, 3).map((dep: any) => ({
          type: 'deposit',
          id: dep.id,
          method: dep.paymentMethod,
          amount: dep.amount,
          status: dep.status,
          date: dep.createdAt,
        }))
        const combined = [...investments, ...deposits]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5)
        setRecentActivity(combined)
      } catch (err) {
        console.error(err)
      }
    }
    if (token) fetchRecent()
  }, [token, stats.activeInvestments])

  const formatCurrency = (amount: number) => {
    return '$' + Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE_TRADE':
      case 'PAYMENT_RECEIVED':
        return 'bg-green-50 text-green-700 border border-green-200'
      case 'PENDING':
      case 'WAITING_FOR_PAYMENT_DETAILS':
      case 'PAYMENT_DETAILS_SENT':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200'
      case 'CLOSED':
      case 'WITHDRAWN':
        return 'bg-brand-blue/5 text-brand-blue border border-brand-blue/20'
      case 'REJECTED':
        return 'bg-red-50 text-red-700 border border-red-200'
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          Hello, {user?.firstName}
          {user?.isVerified && (
            <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified
            </span>
          )}
        </h1>
        <p className="text-sm text-gray-500">Welcome back to your investment dashboard</p>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-blue via-brand-sky to-brand-light p-6 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-10">
          <div className="h-full w-full bg-[radial-gradient(circle_at_30%_70%,white,transparent_70%)]" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">Total Balance</p>
              <p className="mt-1 text-3xl font-bold">{formatCurrency(stats.currentBalance)}</p>
            </div>
            <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
              <Wallet className="h-7 w-7" />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <p className="text-xs text-white/70">Total Invested</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(stats.totalDeposited)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/70">Total Profit</p>
                  <div className="flex items-center gap-1">
                    <p className={`mt-1 text-lg font-semibold ${stats.totalProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                      {stats.totalProfit >= 0 ? '+' : '-'}{formatCurrency(Math.abs(stats.totalProfit))}
                    </p>
                    {stats.totalProfit > 0 && (
                      <TrendingUp className="h-4 w-4 text-green-300" />
                    )}
                    {stats.totalProfit < 0 && (
                      <TrendingDown className="h-4 w-4 text-red-300" />
                    )}
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={async () => {
                      if (stats.activeInvestments === 0) {
                        toast('No active investments to track profit')
                        return
                      }
                      setRequestingProfit(true)
                      try {
                        await api.post('notifications/profit-request')
                      } catch (err) {
                        toast.error('Failed to request profit update')
                      } finally {
                        setRequestingProfit(false)
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-green-300/20 px-3 py-1.5 text-xs font-medium text-green-300 transition-all hover:bg-green-300/30 disabled:opacity-60"
                    title="Click to see profit made so far"
                    disabled={requestingProfit}
                  >
                    Track Profit
                    {requestingProfit && <div className="h-3 w-3 animate-spin rounded-full border border-green-300 border-t-transparent" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={() => router.push('/dashboard/deposits')}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm border border-gray-100 hover:border-brand-sky/30 hover:shadow-md transition-all duration-200"
          >
            <div className="rounded-xl bg-green-50 p-2.5">
              <ArrowDownRight className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-xs font-medium text-gray-700">Transactions</span>
          </button>
          <button
            onClick={() => router.push('/dashboard/investments')}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm border border-gray-100 hover:border-brand-sky/30 hover:shadow-md transition-all duration-200"
          >
            <div className="rounded-xl bg-brand-blue/10 p-2.5">
              <TrendingUp className="h-4 w-4 text-brand-blue" />
            </div>
            <span className="text-xs font-medium text-gray-700">Invest</span>
          </button>
          <button
            onClick={() => router.push('/dashboard/withdrawals')}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm border border-gray-100 hover:border-brand-sky/30 hover:shadow-md transition-all duration-200"
          >
            <div className="rounded-xl bg-purple-50 p-2.5">
              <ArrowUpRight className="h-4 w-4 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-gray-700">Withdraw</span>
          </button>
          <button
            onClick={() => router.push('/dashboard/profile')}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm border border-gray-100 hover:border-brand-sky/30 hover:shadow-md transition-all duration-200"
          >
            <div className="rounded-xl bg-orange-50 p-2.5">
              <Zap className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-gray-700">Profile</span>
          </button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Active Investments</h2>
          <button
            onClick={() => router.push('/dashboard/investments')}
            className="text-sm font-medium text-brand-blue hover:text-brand-blue/80"
          >
            View All
          </button>
        </div>
        {stats.activeInvestments === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <TrendingUp className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">No active investments</p>
            <p className="mt-1 text-xs text-gray-500">Start investing to see your trades here</p>
            <button
              onClick={() => router.push('/dashboard/investments')}
              className="mt-4 rounded-xl bg-gradient-to-r from-brand-blue to-brand-sky px-5 py-2 text-sm font-medium text-white hover:from-brand-blue/90 hover:to-brand-sky/90 transition-all duration-200"
            >
              Start Investing
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity
              .filter((a) => a.type === 'investment' && (a.status === 'PAYMENT_RECEIVED' || a.status === 'ACTIVE_TRADE'))
              .slice(0, 3)
              .map((activity) => (
                <div key={activity.id} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-brand-blue/10 p-2.5">
                      <TrendingUp className="h-4 w-4 text-brand-blue" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.plan}</p>
                      <p className="text-xs text-gray-500">{activity.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(activity.amount)}</p>
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(activity.status)}`}>
                      {activity.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">How It Works</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue to-brand-sky text-white font-bold text-sm">1</div>
            <div>
              <p className="text-sm font-medium text-gray-900">Deposit Funds</p>
              <p className="text-xs text-gray-500">Deposit via EcoCash</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue to-brand-sky text-white font-bold text-sm">2</div>
            <div>
              <p className="text-sm font-medium text-gray-900">Choose Plan</p>
              <p className="text-xs text-gray-500">Select an investment package</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue to-brand-sky text-white font-bold text-sm">3</div>
            <div>
              <p className="text-sm font-medium text-gray-900">Earn Profit</p>
              <p className="text-xs text-gray-500">Get guaranteed returns after 6 hours</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}