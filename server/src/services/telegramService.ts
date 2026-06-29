import TelegramBot from 'node-telegram-bot-api'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || ''
const BOT_SECRET = process.env.BOT_SECRET || 'ecocash_bot_secret_2024'

let bot: TelegramBot | null = null
let isReady = false

export const initTelegramBot = async (): Promise<TelegramBot | null> => {
  if (!BOT_TOKEN) {
    console.log('Telegram bot not configured - skipping init')
    return null
  }

  if (bot && isReady) return bot

  // Don't use polling on Vercel serverless
  if (process.env.VERCEL) {
    console.log('Skipping Telegram polling on Vercel')
    return null
  }

  try {
    bot = new TelegramBot(BOT_TOKEN, { polling: true })
    isReady = true
    console.log('Telegram bot initialized successfully')
    return bot
  } catch (error) {
    console.error('Telegram bot init error:', error)
    return null
  }
}

export const getTelegramBot = (): TelegramBot | null => {
  return bot
}

export const sendTelegramMessage = async (text: string, options?: TelegramBot.SendMessageOptions): Promise<void> => {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID || !bot) {
    console.log('Telegram not configured - message would be:', text.substring(0, 100))
    return
  }

  try {
    await bot.sendMessage(ADMIN_CHAT_ID, text, options)
  } catch (error) {
    console.error('Telegram send error:', error)
  }
}

export const sendTelegramWithButtons = async (text: string, buttons: { text: string; callback_data: string }[]): Promise<void> => {
  const markup = {
    inline_keyboard: buttons.map((btn) => [{ text: btn.text, callback_data: btn.callback_data }]),
  }

  await sendTelegramMessage(text, { reply_markup: markup })
}

export const notifyNewUser = async (email: string, userId: string): Promise<void> => {
  if (process.env.VERCEL) {
    console.log('Skipping new user notification on Vercel (polling disabled)')
    return
  }
  
  const buttons = [
    { text: '✅ Approve', callback_data: `approve_user_${userId}` },
    { text: '❌ Reject', callback_data: `reject_user_${userId}` },
  ]
  await sendTelegramWithButtons(`🆕 New User Registration\n\nEmail: ${email}\nUser ID: ${userId}`, buttons)
}

export const notifyNewInvestment = async (investmentId: string, userName: string, amount: number, userId: string, invUuid: string): Promise<void> => {
  if (process.env.VERCEL) {
    console.log('Skipping investment notification on Vercel (polling disabled)')
    return
  }
  
  const buttons = [
    { text: 'Send EcoCash Details', callback_data: `send_ecocash_${invUuid}` },
    { text: 'Start Trade', callback_data: `start_trade_${invUuid}` },
    { text: 'Reject', callback_data: `reject_investment_${invUuid}` },
  ]
  console.log('Sending Telegram notification for new investment:', { investmentId, userName, amount, invUuid })
  await sendTelegramWithButtons(`💰 New Investment Request\n\nUser: ${userName}\nAmount: $${amount}\nRequest ID: ${investmentId}`, buttons)
}

export const notifyDepositSubmitted = async (depositId: string, userName: string, amount: number, method: string, receiptPath?: string, txHash?: string): Promise<void> => {
  if (process.env.VERCEL) {
    console.log('Skipping deposit notification on Vercel (polling disabled)')
    return
  }
  
  const buttons = [
    { text: '✅ Approve', callback_data: `approve_deposit_${depositId}` },
    { text: '❌ Reject', callback_data: `reject_deposit_${depositId}` },
  ]

  if (receiptPath && bot) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const uploadsPath = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '../../public/uploads')
    
    try {
      if (fs.existsSync(path.join(uploadsPath, receiptPath.replace('/uploads/', '')))) {
        const photoStream = fs.createReadStream(path.join(uploadsPath, receiptPath.replace('/uploads/', '')))
        await bot.sendPhoto(ADMIN_CHAT_ID, photoStream, {
          caption: `📥 Payment Submitted\n\nUser: ${userName}\nAmount: $${amount}\nMethod: ${method}${txHash ? `\nTxHash: ${txHash}` : ''}`,
          reply_markup: {
            inline_keyboard: buttons.map((btn) => [{ text: btn.text, callback_data: btn.callback_data }]),
          },
        })
      } else {
        await sendTelegramWithButtons(`📥 Payment Submitted\n\nUser: ${userName}\nAmount: $${amount}\nMethod: ${method}\nReceipt: File not found${txHash ? `\nTxHash: ${txHash}` : ''}`, buttons)
      }
    } catch (error) {
      console.error('Failed to send photo, falling back to message:', error)
      await sendTelegramWithButtons(`📥 Payment Submitted\n\nUser: ${userName}\nAmount: $${amount}\nMethod: ${method}\nReceipt: ${receiptPath}${txHash ? `\nTxHash: ${txHash}` : ''}`, buttons)
    }
  } else {
    await sendTelegramWithButtons(`📥 Payment Submitted\n\nUser: ${userName}\nAmount: $${amount}\nMethod: ${method}${txHash ? `\nTxHash: ${txHash}` : ''}`, buttons)
  }
}

export const notifyWithdrawalRequest = async (withdrawalId: string, userName: string, amount: number, method: string): Promise<void> => {
  if (process.env.VERCEL) {
    console.log('Skipping withdrawal notification on Vercel (polling disabled)')
    return
  }
  
  const buttons = [
    { text: 'Paid', callback_data: `paid_withdrawal_${withdrawalId}` },
    { text: 'Reject', callback_data: `reject_withdrawal_${withdrawalId}` },
  ]
  await sendTelegramWithButtons(`💸 Withdrawal Request\n\nUser: ${userName}\nAmount: $${amount}\nMethod: ${method}`, buttons)
}

export const notifyTradeClosed = async (investmentId: string, userName: string): Promise<void> => {
  if (process.env.VERCEL) return
  await sendTelegramMessage(`🔒 Trade Closed\n\nInvestment: ${investmentId}\nUser: ${userName}`)
}

export const notifyAuditLog = async (action: string, adminId?: string, details?: any): Promise<void> => {
  if (process.env.VERCEL) return
  await sendTelegramMessage(`📋 Audit Log\nAction: ${action}\nAdmin: ${adminId || 'system'}${details ? `\nDetails: ${JSON.stringify(details)}` : ''}`)
}

export const notifyKYCSubmission = async (userId: string, userName: string, selfieUrl?: string, idFrontUrl?: string, idBackUrl?: string): Promise<void> => {
  if (process.env.VERCEL) {
    console.log('Skipping KYC notification on Vercel (polling disabled)')
    return
  }
  
  const buttons = [
    { text: '✅ Approve KYC', callback_data: `approve_kyc_${userId}` },
    { text: '❌ Reject KYC', callback_data: `reject_kyc_${userId}` },
  ]

  if (bot && ADMIN_CHAT_ID) {
    try {
      const __dirname = path.dirname(fileURLToPath(import.meta.url))
      const uploadsPath = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '../../public/uploads')

      // Send selfie photo
      if (selfieUrl) {
        const selfiePath = path.join(uploadsPath, selfieUrl.replace('/uploads/', ''))
        if (fs.existsSync(selfiePath)) {
          const photoStream = fs.createReadStream(selfiePath)
          await bot.sendPhoto(ADMIN_CHAT_ID, photoStream, {
            caption: `Selfie - ${userName}`,
          })
        }
      }

      // Send ID front photo
      if (idFrontUrl) {
        const frontPath = path.join(uploadsPath, idFrontUrl.replace('/uploads/', ''))
        if (fs.existsSync(frontPath)) {
          const photoStream = fs.createReadStream(frontPath)
          await bot.sendPhoto(ADMIN_CHAT_ID, photoStream, {
            caption: `ID Front - ${userName}`,
          })
        }
      }

      // Send ID back photo
      if (idBackUrl) {
        const backPath = path.join(uploadsPath, idBackUrl.replace('/uploads/', ''))
        if (fs.existsSync(backPath)) {
          const photoStream = fs.createReadStream(backPath)
          await bot.sendPhoto(ADMIN_CHAT_ID, photoStream, {
            caption: `ID Back - ${userName}`,
          })
        }
      }

      // Send message with buttons after photos
      await sendTelegramWithButtons(`📋 KYC Submission\n\nUser: ${userName}\nID: ${userId}\n\nDocuments attached for verification`, buttons)
    } catch (error) {
      console.error('Failed to send KYC photos, sending message only:', error)
      await sendTelegramWithButtons(`📋 KYC Submission\n\nUser: ${userName}\nID: ${userId}\n\nDocuments attached for verification`, buttons)
    }
  }
}