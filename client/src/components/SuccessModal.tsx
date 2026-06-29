'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { CheckCircle, Copy, MessageCircle } from 'lucide-react'

interface SuccessModalProps {
  open: boolean
  onClose: () => void
  amount: string
}

export function SuccessModal({ open, onClose, amount }: SuccessModalProps) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText('+254705322372')
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-6 text-left align-middle shadow-2xl transition-all border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <Dialog.Title as="h3" className="text-xl font-bold text-gray-900">
                    Withdrawal Submitted
                  </Dialog.Title>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  Withdrawal of <span className="font-semibold text-brand-blue">${amount}</span> submitted. 
                  Wait for 5-10 mins. The funds will be deposited to your EcoCash account.
                </div>
                <div className="rounded-xl bg-gray-50 p-4 mb-4">
                  <p className="text-xs text-gray-500 mb-2">If it delays, contact us on WhatsApp:</p>
                  <a 
                    href="https://wa.me/254705322372" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-lg font-semibold text-green-600 hover:text-green-700"
                  >
                    <MessageCircle className="h-5 w-5" />
                    +254705322372
                  </a>
                </div>
                <div className="flex justify-end">
                  <button 
                    type="button" 
                    onClick={onClose} 
                    className="rounded-xl bg-gradient-to-r from-brand-blue to-brand-sky px-5 py-2 text-sm font-medium text-white hover:from-brand-blue/90 hover:to-brand-sky/90 transition-all duration-200"
                  >
                    OK
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}