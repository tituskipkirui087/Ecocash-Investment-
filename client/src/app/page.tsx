'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { TrendingUp, Shield, Zap, Clock, ArrowRight, BarChart3, Check, Activity, ChevronDown, Lock, CreditCard, Package, BarChart2, PieChart as PieChartIcon, X, AlertCircle } from 'lucide-react'
import TradingViewWidget from '@/components/TradingViewWidget'

type Plan = {
  id: string
  name: string
  slug: string
  description: string
  minAmount: number
  maxAmount: number | null
  returnMultiplier: number
  tradeDurationHours: number
}

export default function Home() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [disclaimerOpen, setDisclaimerOpen] = useState(false)
  const { token } = useAuth()

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data } = await api.get('investments/plans')
        setPlans(data.data)
      } catch (err) {
        console.error(err)
      }
    }
    fetchPlans()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="bg-gray-900 border-b border-gray-800 relative z-50">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <div className="flex items-center justify-between h-14">
              <div className="flex-shrink-0">
                <Link href="/" className="flex items-center">
                  <img src="/images/ecocash-logo.svg" alt="EcoCash" className="h-7 w-auto" />
                  <span className="ml-2 text-lg font-bold">
                    <span className="text-brand-blue">ECO</span><span className="text-red-500">CASH</span>
                  </span>
                </Link>
              </div>

              <nav className="hidden md:flex space-x-6">
                <div className="relative" onMouseEnter={(e) => e.currentTarget.querySelector('.dropdown')?.classList.remove('hidden')} onMouseLeave={(e) => e.currentTarget.querySelector('.dropdown')?.classList.add('hidden')}>
                  <button className="group inline-flex items-center px-1 pt-1 text-xs font-medium text-gray-300 hover:text-white focus:outline-none">
                    <span className="text-xs">Trading</span>
                    <ChevronDown className="ml-1 h-3 w-3 text-gray-500 group-hover:text-gray-300" />
                  </button>
                  <div className="dropdown absolute left-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-dark-300 ring-1 ring-black ring-opacity-5 z-50 hidden">
                    <Link href="/cryptocurrencies" className="block px-3 py-1.5 text-xs text-gray-300 hover:bg-dark-200">Cryptocurrencies</Link>
                    <Link href="/forex" className="block px-3 py-1.5 text-xs text-gray-300 hover:bg-dark-200">Forex</Link>
                    <Link href="/shares" className="block px-3 py-1.5 text-xs text-gray-300 hover:bg-dark-200">Shares</Link>
                    <Link href="/indices" className="block px-3 py-1.5 text-xs text-gray-300 hover:bg-dark-200">Indices</Link>
                    <Link href="/commodities" className="block px-3 py-1.5 text-xs text-gray-300 hover:bg-dark-200">Commodities</Link>
                  </div>
                </div>

                <Link href="/for-traders" className="inline-flex items-center px-1 pt-1 text-xs font-medium text-gray-300 hover:text-white">Education</Link>
                <Link href="/contacts" className="inline-flex items-center px-1 pt-1 text-xs font-medium text-gray-300 hover:text-white">Contact</Link>
              </nav>

              <div className="hidden md:flex items-center space-x-3">
                {token ? (
                  <Link href="/dashboard" className="text-gray-300 hover:text-white flex items-center text-xs">
                    <BarChart3 className="h-3 w-3 mr-1" />
                    <span>Dashboard</span>
                  </Link>
                ) : (
                  <>
                    <Link href="/login" className="text-gray-300 hover:text-white flex items-center text-xs">
                      <Lock className="h-3 w-3 mr-1" />
                      <span>Login</span>
                    </Link>
                    <Link href="/register" className="bg-brand-blue hover:bg-brand-blue/80 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors">
                      Sign up
                    </Link>
                  </>
                )}
              </div>

              <div className="flex md:hidden items-center">
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} type="button" className="inline-flex items-center justify-center p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none">
                  <span className="sr-only">Open main menu</span>
                  {mobileMenuOpen ? (
                    <svg className="block h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="block h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-3">
              <div className="space-y-1">
                <Link href="/cryptocurrencies" className="block px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 rounded">Cryptocurrencies</Link>
                <Link href="/forex" className="block px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 rounded">Forex</Link>
                <Link href="/shares" className="block px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 rounded">Shares</Link>
                <Link href="/indices" className="block px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 rounded">Indices</Link>
                <Link href="/commodities" className="block px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 rounded">Commodities</Link>
                <Link href="/for-traders" className="block px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 rounded">Education</Link>
                <Link href="/contacts" className="block px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 rounded">Contact</Link>
              </div>
              {!token && (
                <div className="mt-2 flex space-x-2">
                  <Link href="/login" className="text-gray-300 hover:bg-gray-700 px-2 py-1 rounded text-xs">Login</Link>
                  <Link href="/register" className="bg-brand-blue text-white px-3 py-1 rounded text-xs">Sign up</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-dark-400 py-16">
          <div className="absolute inset-0 z-0">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-30"
              poster="/images/hero-poster.jpg"
            >
              <source src="https://ecocash.co.zw/wp-content/uploads/2025/07/Ecocash-Cards.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-dark-400/60" />
            <div className="light-streaks absolute inset-0 opacity-30 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-16 left-8 w-80 h-80 bg-brand-blue/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-16 right-8 w-80 h-80 bg-green-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/15 rounded-full blur-2xl animate-pulse delay-500" />
              </div>
            </div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
            <div className="w-full text-center">
              <div className="inline-block px-2.5 py-0.5 mb-3 text-2xs font-semibold tracking-wider text-brand-blue uppercase bg-brand-blue/30 rounded-full">
                Premium Investment Platform
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
                <span className="block">Invest in Digital Assets</span>
                <span className="block mt-1.5 text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-green-400">With Confidence</span>
              </h1>
              <p className="max-w-2xl mx-auto mt-4 text-sm md:text-base text-gray-300">
                Access advanced investment tools for Cryptocurrencies, Forex, Commodities, Indices, and more with competitive returns and lightning-fast execution.
              </p>

              <div className="flex flex-wrap gap-3 mt-6 justify-center">
                {token ? (
                  <Link href="/dashboard/investments" className="px-6 py-2 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/80 shadow-lg transition-all">
                    Start Investing
                  </Link>
                ) : (
                  <>
                    <Link href="/register" className="px-6 py-2 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/80 shadow-lg transition-all">
                      Create Account
                    </Link>
                    <Link href="/login" className="px-6 py-2 text-sm font-medium text-gray-200 bg-dark-200 border border-gray-700 rounded-lg hover:bg-dark-100 shadow-lg transition-all">
                      Login
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-dark-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold text-white">Why Invest With Us</h2>
              <p className="mt-1.5 text-gray-400">Everything you need for successful investing</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-brand-blue/20 rounded-full flex items-center justify-center mb-3">
                  <Zap className="h-6 w-6 text-brand-blue" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Auto Mining</h3>
                <p className="text-gray-400 text-xs">Our electronic mining machine trades automatically on your behalf</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-green-600/20 rounded-full flex items-center justify-center mb-3">
                  <Shield className="h-6 w-6 text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Profit Lock</h3>
                <p className="text-gray-400 text-xs">100% guarantee for locking all incoming profits</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-brand-blue/20 rounded-full flex items-center justify-center mb-3">
                  <TrendingUp className="h-6 w-6 text-brand-blue" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Stable Signals</h3>
                <p className="text-gray-400 text-xs">Trade signals protected from negative market effects</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-yellow-600/20 rounded-full flex items-center justify-center mb-3">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Fast Returns</h3>
                <p className="text-gray-400 text-xs">Trades complete in 6 hours with guaranteed returns</p>
              </div>
            </div>
          </div>
        </section>

        {plans.length > 0 && (
          <section className="py-16 bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-10 text-center">
                <span className="inline-block px-3 py-0.5 text-xs font-semibold tracking-wider text-brand-blue uppercase bg-brand-blue/70 rounded-full">
                  Investment Plans
                </span>
                <h2 className="mt-2 text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-blue/80">
                  Choose Your Investment Package
                </h2>
                <p className="mt-2 text-gray-300 max-w-2xl mx-auto text-sm">Select the perfect plan that suits your investment strategy</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan, idx) => {
                  const profitReturn = plan.minAmount * plan.returnMultiplier
                  const colors = ['from-brand-blue to-brand-blue/80', 'from-green-600/80 to-green-400/80', 'from-indigo-600/80 to-indigo-400/80']
                  const isPopular = plan.slug === 'professional'
                  return (
                    <div key={plan.id} className={`relative group ${isPopular ? 'transform scale-105' : ''}`}>
                      <div className={`absolute inset-0 bg-gradient-to-b ${colors[idx % colors.length]}/20 rounded-xl transform rotate-1 group-hover:rotate-0 transition-all duration-300 opacity-50`} />
                      <div className="relative bg-gray-800/90 rounded-xl p-5 border border-gray-700 group-hover:border-brand-blue/60 transition-all">
                        {isPopular && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                            <span className="bg-gradient-to-r from-amber-500 to-brand-blue/80 text-white text-2xs px-2.5 py-0.5 font-semibold rounded-bl rounded-tr">Most Popular</span>
                          </div>
                        )}
                        <div className={`w-10 h-10 bg-gradient-to-br ${colors[idx % colors.length]} rounded-full flex items-center justify-center mb-3`}>
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1.5">{plan.name}</h3>
                        <p className="text-gray-400 text-2xs mb-3">{plan.description}</p>
                        <div className="space-y-2 mb-5">
                          <div className="flex justify-between text-2xs"><span className="text-gray-400">Investment</span><span className="font-semibold text-white">${plan.minAmount}{plan.maxAmount ? ` - $${plan.maxAmount}` : '+'}</span></div>
                          <div className="flex justify-between text-2xs"><span className="text-gray-400">Your Profit</span><span className="font-semibold text-green-400">${profitReturn.toLocaleString()}</span></div>
                          <div className="flex justify-between text-2xs"><span className="text-gray-400">Duration</span><span className="font-semibold text-white">{plan.tradeDurationHours}h</span></div>
                          <div className="flex justify-between text-2xs"><span className="text-gray-400">Return</span><span className="font-bold text-brand-blue">{plan.returnMultiplier}x</span></div>
                        </div>
                        <Link href={token ? '/dashboard/investments' : '/register'} className={`block w-full text-center py-2 rounded-lg font-semibold text-white bg-gradient-to-r ${colors[idx % colors.length]} hover:opacity-90 transition-all text-xs`}>
                          {token ? 'Invest Now' : 'Get Started'}
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        <section className="py-16 bg-dark-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <span className="inline-block px-3 py-0.5 text-xs font-semibold tracking-wider text-green-400 uppercase bg-green-900/30 rounded-full">Trading Products</span>
              <h2 className="mt-2 text-2xl font-bold text-white">Diverse Trading Products</h2>
              <p className="mt-1.5 text-gray-400">Access global markets with competitive conditions</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[{name: 'Forex', icon: BarChart2, href: '/forex', iconColor: 'text-brand-blue'}, {name: 'Shares', icon: CreditCard, href: '/shares', iconColor: 'text-green-400'}, {name: 'Commodities', icon: Package, href: '/commodities', iconColor: 'text-yellow-400'}, {name: 'Indices', icon: PieChartIcon, href: '/indices', iconColor: 'text-indigo-400'}].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.name} className="relative group">
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.iconColor}/20 rounded-xl transform rotate-1 group-hover:rotate-0 transition-all duration-300 opacity-50`} />
                    <div className="relative bg-dark-400 p-5 rounded-xl border border-gray-700 group-hover:border-brand-blue/50 transition-all">
                      <div className={`${item.iconColor}/20 rounded-full flex items-center justify-center mb-3 w-10 h-10`}>
                        <Icon className={`h-5 w-5 ${item.iconColor}`} />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1.5">{item.name}</h3>
                      <p className="text-gray-400 mb-3 text-2xs">Trade with competitive spreads</p>
                      <Link href={item.href} className={`${item.iconColor} hover:${item.iconColor}/80 flex items-center text-2xs font-medium`}>
                        Explore {item.name}
                        <ArrowRight className="h-2.5 w-2.5 ml-1" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <span className="inline-block px-3 py-0.5 text-xs font-semibold tracking-wider text-brand-blue uppercase bg-brand-blue/70 rounded-full">Our Story</span>
              <h2 className="mt-2 text-2xl font-bold text-white">About Us</h2>
              <p className="mt-2 text-gray-300 max-w-2xl mx-auto text-sm">EcoCash Investment offers premium trading with competitive spreads</p>
            </div>
            <div className="max-w-4xl mx-auto bg-dark-400/80 p-6 rounded-xl border border-gray-800 shadow-xl">
              <p className="text-gray-300 leading-relaxed text-sm">Our platform has become one of the most reputable, offering traders CFDs across Forex, Equities, Commodities and Futures.</p>
              <p className="text-gray-300 leading-relaxed mt-3 text-sm">You don't need to be a professional trader. All you need is the right skill set. We let you trade in the way that best suits you.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-dark-300 p-3 rounded-lg">
                  <h3 className="text-white font-semibold flex items-center text-sm"><Check className="h-4 w-4 text-brand-blue mr-1.5" />Personalized Trading</h3>
                  <p className="text-gray-400 mt-1.5 text-2xs">Choose your risk level and trade duration</p>
                </div>
                <div className="bg-dark-300 p-3 rounded-lg">
                  <h3 className="text-white font-semibold flex items-center text-sm"><Check className="h-4 w-4 text-brand-blue mr-1.5" />Complete Control</h3>
                  <p className="text-gray-400 mt-1.5 text-2xs">We provide the right tools for trading</p>
                </div>
              </div>
              <div className="mt-5 text-center">
                <Link href="/about" className="inline-flex items-center px-5 py-2 text-white bg-brand-blue rounded-lg hover:bg-brand-blue/80 transition-all text-sm">
                  Learn More
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gradient-to-b from-dark-300 to-dark-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <span className="inline-block px-3 py-0.5 text-xs font-semibold tracking-wider text-brand-blue uppercase bg-brand-blue/70 rounded-full">Simple Process</span>
              <h2 className="mt-2 text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-blue/80">How It Works</h2>
              <p className="mt-2 text-gray-300 max-w-2xl mx-auto text-sm">Get started with investing in three simple steps</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((step) => (
                <div key={step} className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-b from-brand-blue/20 to-brand-blue/40 rounded-xl transform rotate-1 group-hover:rotate-0 transition-all duration-300 opacity-50" />
                  <div className="relative bg-gray-800/90 rounded-xl p-6 shadow-lg border border-gray-700 group-hover:border-brand-blue/60 transition-all duration-500 hover:-translate-y-1">
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 bg-brand-blue rounded-full flex items-center justify-center text-white text-lg font-bold">{step}</div>
                    </div>
                    <h3 className="text-lg font-bold text-center text-white mb-2">{step === 1 ? 'Deposit' : step === 2 ? 'Trade' : 'Withdraw'}</h3>
                    <p className="text-gray-300 text-center mb-4 text-sm">
                      {step === 1 ? 'Open account and add funds' : step === 2 ? 'Trade with advanced tools' : 'Withdraw funds easily'}
                    </p>
                    <div className="text-center">
                      <Link href={step === 1 ? '/dashboard/investments' : step === 2 ? '/login' : '/login'} className="inline-flex items-center px-5 py-2 text-white bg-brand-blue rounded-lg hover:bg-brand-blue/80 transition-all text-sm">
                        {step === 1 ? 'Get Started' : step === 2 ? 'Explore Markets' : 'Learn More'}
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <span className="inline-block px-3 py-0.5 text-xs font-semibold tracking-wider text-brand-blue uppercase bg-brand-blue/70 rounded-full">Market Data</span>
              <h2 className="mt-2 text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-blue/80">Live Market Performance</h2>
              <p className="mt-2 text-gray-300 max-w-2xl mx-auto text-sm">Track real-time market movements and make informed investment decisions</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-dark-400 rounded-xl p-5 border border-gray-700">
                <h3 className="text-base font-bold text-white mb-3 flex items-center"><Activity className="h-4 w-4 text-brand-blue mr-1.5" />Top Gainers</h3>
                <TradingViewWidget symbol="NASDAQ:AAPL" height={280} />
              </div>
              <div className="bg-dark-400 rounded-xl p-5 border border-gray-700">
                <h3 className="text-base font-bold text-white mb-3 flex items-center"><Activity className="h-4 w-4 text-green-400 mr-1.5" />Forex Market</h3>
                <TradingViewWidget symbol="FX:USDZWD" height={280} />
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 bg-dark-300 border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-4">Download Our App</h2>
              <div className="flex flex-wrap gap-3 justify-center mb-6">
                <a
                  href="https://apps.apple.com/zw/app/ecocash-super-app/id6760653620"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center bg-black text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <svg className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.82 1.39-3.05 2.17-4.71 2.17-2.31 0-4.44-1.06-5.89-2.86-1.45-1.8-2.03-4.18-1.55-6.82.26-1.36.87-2.63 1.76-3.69.91-1.08 2.11-1.83 3.48-2.1.75-.16 1.54-.21 2.46-.15 2.31.17 4.17 1.93 4.92 4.37.36.99.5 2.09.41 3.27-.24 2.66-1.44 4.61-3.65 5.87-1.65.89-2.87 1.34-3.86 1.61-.4.1-.78.21-1.17.33.93 1.46 2.74 2.27 4.95 2.27 1.78 0 3.65-.5 5.28-1.78 1.91-1.44 2.98-3.87 2.98-6.3 0-1.5-.36-2.97-1.13-4.31-.39-.62-.81-1.18-1.26-1.69zm-2.52-6.4c.13 1.6-.42 3.01-1.47 3.6-.66.36-1.45.46-2.19.29-.74-.17-1.34-.57-1.72-1.14-.38-.57-.53-1.23-.43-1.92.11-.71.47-1.31 1-1.71.55-.41 1.24-.56 2.02-.42.78.16 1.42.53 1.85 1.07.43.54.66 1.2 1.9z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-2xs text-gray-400">Download on the</div>
                    <div className="text-sm font-semibold">App Store</div>
                  </div>
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.ecocash.superapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center bg-black text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <svg className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3,2V22L13.6,12L3,2M15.6,8.8V6.4L21.1,12L15.6,17.6V15.2L19.2,12L15.6,8.8Z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-2xs text-gray-400">Get it on</div>
                    <div className="text-sm font-semibold">Google Play</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-dark-400 text-gray-300">
        <div className="border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <div className="flex items-center mb-5">
                    <img src="/images/ecocash-logo.svg" alt="EcoCash" className="h-7 w-auto" />
                    <span className="ml-2 text-base font-bold">
                      <span className="text-brand-blue">ECO</span><span className="text-red-500">CASH</span>
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-5">EcoCash offers CFD trading with competitive spreads and advanced tools.</p>
                </div>
                <div>
                  <h3 className="text-2xs font-semibold text-white uppercase mb-3">Quick Links</h3>
                  <ul className="space-y-2">
                    <li><Link href="/about" className="text-2xs text-gray-400 hover:text-white transition">About Us</Link></li>
                    <li><Link href="/for-traders" className="text-2xs text-gray-400 hover:text-white transition">Education</Link></li>
                    <li><Link href="/contacts" className="text-2xs text-gray-400 hover:text-white transition">Contact</Link></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-2xs font-semibold text-white uppercase mb-3">Trading</h3>
                  <ul className="space-y-2">
                    <li><Link href="/cryptocurrencies" className="text-2xs text-gray-400 hover:text-white transition">Cryptocurrencies</Link></li>
                    <li><Link href="/forex" className="text-2xs text-gray-400 hover:text-white transition">Forex</Link></li>
                    <li><Link href="/shares" className="text-2xs text-gray-400 hover:text-white transition">Shares</Link></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-2xs font-semibold text-white uppercase mb-3">Account</h3>
                  <ul className="space-y-2">
                    <li><Link href="/login" className="text-2xs text-gray-400 hover:text-white transition">Login</Link></li>
                    <li><Link href="/register" className="text-2xs text-gray-400 hover:text-white transition">Sign Up</Link></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-dark-500 border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="text-2xs text-gray-400">
              <p className="mb-3 leading-relaxed"><span className="font-semibold text-gray-300">RISK WARNING:</span> Trading carries a high level of risk. Never invest money you cannot afford to lose.</p>
              <button
                onClick={() => setDisclaimerOpen(true)}
                className="text-brand-blue hover:text-brand-blue/80 underline mb-3 flex items-center justify-center mx-auto text-xs"
              >
                <AlertCircle className="h-3.5 w-3.5 mr-1" />
                Read Full Disclaimer
              </button>
              <p className="text-2xs">© {new Date().getFullYear()} EcoCash Investment Platform. All Rights Reserved.</p>
            </div>
          </div>
        </div>
      </footer>

      {disclaimerOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-400 rounded-xl max-w-2xl w-full p-5 border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-white">Risk Disclaimer</h3>
              <button
                onClick={() => setDisclaimerOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-gray-300 text-2xs space-y-2 max-h-80 overflow-y-auto">
              <p>Trading financial instruments carries a high level of risk and may not be suitable for all investors.</p>
              <p>Possible advantages of CFD trading may include:</p>
              <ul className="list-disc list-inside space-y-0.5 text-gray-400">
                <li>Ability to go long or short</li>
                <li>Leverage trading available</li>
                <li>Availability across multiple asset classes</li>
                <li>Free markets data and news</li>
              </ul>
              <p>However, there are also significant risks including:</p>
              <ul className="list-disc list-inside space-y-0.5 text-gray-400">
                <li>Potential loss of entire investment</li>
                <li>Leverage can amplify losses</li>
                <li>Market volatility affects positions</li>
                <li>Possible exposure to negative balance</li>
              </ul>
              <p>You should never invest money you cannot afford to lose. Past performance is not indicative of future results.</p>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setDisclaimerOpen(false)}
                className="px-5 py-1.5 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/80 transition-colors text-sm"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}