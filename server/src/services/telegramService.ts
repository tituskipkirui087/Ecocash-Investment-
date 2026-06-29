import TelegramBot from 'node-telegram-bot-api'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || ''
const BOT_SECRET = process.env.BOT_SECRET || 'ecocash_bot_secret_2024'
const API_URL = process.env.FRONTEND_URL?.replace(/:3000/, ':5000') || 'http://localhost:5000'

let bot: TelegramBot | null = null
let isReady = false

const callApi = async (endpoint: string, method: string = 'POST', body?: any) => {
  const url = `${API_URL}/api${endpoint}`
  console.log('Bot calling API:', { url, method, body })
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-bot-secret': BOT_SECRET,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json()
    console.log('API response:', { status: res.status, data })
    return data
  } catch (e) {
    console.error('API call error:', e)
    return null
  }
}

export const initTelegramBot = async (): Promise<TelegramBot | null> => {
  if (!BOT_TOKEN) {
    console.log('Telegram bot not configured - skipping init')
    return null
  }

  if (bot && isReady) return bot

  try {
    bot = new TelegramBot(BOT_TOKEN, { polling: true })

    bot.setMyCommands([
      { command: '/start', description: 'Start the bot' },
      { command: '/pending', description: 'View pending actions' },
      { command: '/users', description: 'List all users' },
      { command: '/investments', description: 'List investments' },
      { command: '/withdrawals', description: 'List withdrawals' },
    ])

    bot.on('polling_error', (error) => {
      console.log('Telegram polling error:', error.message)
    })

    bot.on('message', async (msg) => {
      if (!msg.text || !msg.chat) return
      
      const chatId = String(msg.chat.id)
      
      if (chatId !== ADMIN_CHAT_ID) return

      const pending = (bot as any).pendingEcocashInput
      if (pending && msg.text.startsWith('ecocash:')) {
        const parts = msg.text.slice(8).split(',')
        if (parts.length >= 2) {
          const [number, name] = parts
          const investmentId = pending.investmentId
          console.log('Sending EcoCash details to api:', { investmentId, number, name })
          const result = await callApi(`/deposits/admin/send-details/${investmentId}`, 'POST', {
            status: 'PAYMENT_DETAILS_SENT',
            ecocashNumber: number.trim(),
            ecocashAccountName: name.trim(),
          })
          console.log('API result:', result)
          if (result?.success) {
            bot!.sendMessage(chatId, `✅ EcoCash details sent to user for investment ${investmentId}`)
          } else {
            bot!.sendMessage(chatId, `❌ Failed to send EcoCash details: ${JSON.stringify(result)}`)
          }
        }
        delete (bot as any).pendingEcocashInput
        return
      }

      if (msg.text.match(/^\$\d+/)) {
        const amount = msg.text.replace('$', '').trim()
        const result = await callApi('/notifications/update-latest-profit', 'PUT', { profitAmount: Number(amount) })
        console.log('Profit update result:', result)
        if (result?.success) {
          bot!.sendMessage(chatId, `✅ Profit updated to $${amount}`)
        } else {
          bot!.sendMessage(chatId, `❌ Failed to update profit: ${result?.message || 'Unknown error'}`)
        }
        return
      }
      
      if (msg.text === '/start') {
        bot!.sendMessage(ADMIN_CHAT_ID, `🤖 Bot Active!\n\nAdmin Chat ID: ${ADMIN_CHAT_ID}\n\nAvailable commands:\n/pending - Pending items\n/users - All users\n/investments - Investments\n/withdrawals - Withdrawals\n/approve <id> - Approve user\n/reject <id> - Reject user\n/approve_deposit <id> - Approve deposit\n/reject_deposit <id> - Reject deposit`)
        return
      }
      
      if (msg.text === '/pending') {
        const users = await callApi('/auth/pending-users', 'GET')
        bot!.sendMessage(chatId, JSON.stringify(users, null, 2))
        return
      }
    })

    bot.on('callback_query', async (query) => {
      if (!query.data || !query.message) return
      
      const callbackData = query.data
      const chatId = String(query.message.chat.id)
      
      if (chatId !== ADMIN_CHAT_ID) {
        bot!.answerCallbackQuery(query.id, { text: 'Unauthorized' })
        return
      }
      
      try {
        if (callbackData.startsWith('approve_user_')) {
          const userId = callbackData.replace('approve_user_', '')
          const result = await callApi(`/auth/approve-user/${userId}`, 'POST')
          if (result?.success) {
            bot!.sendMessage(chatId, `✅ User approved!\n\nThey can now login.`)
          } else {
            bot!.sendMessage(chatId, `❌ Failed to approve user`)
          }
          bot!.answerCallbackQuery(query.id, { text: 'User Approved!' })
        } 
        else if (callbackData.startsWith('reject_user_')) {
          const userId = callbackData.replace('reject_user_', '')
          const result = await callApi(`/auth/reject-user/${userId}`, 'POST')
          if (result?.success) {
            bot!.sendMessage(chatId, `❌ User rejected.`)
          } else {
            bot!.sendMessage(chatId, `❌ Failed to reject user`)
          }
          bot!.answerCallbackQuery(query.id, { text: 'User Rejected!' })
        }
        else if (callbackData.startsWith('approve_deposit_')) {
          const depositId = callbackData.replace('approve_deposit_', '')
          const result = await callApi(`/deposits/admin/approve/${depositId}`, 'POST')
          if (result?.success) {
            const investmentId = result.data.investment?.id || result.data.investmentId
            const buttons = [
              { text: '🚀 Start Trade', callback_data: `start_trade_${investmentId}` },
            ]
            await bot!.sendMessage(chatId, `✅ Deposit ${depositId} approved!\n\nUse Start Trade button when ready.`, {
              reply_markup: {
                inline_keyboard: buttons.map((btn) => [{ text: btn.text, callback_data: btn.callback_data }]),
              },
            })
          } else {
            bot!.sendMessage(chatId, `❌ Failed to approve deposit`)
          }
          bot!.answerCallbackQuery(query.id, { text: 'Deposit Approved!' })
        }
        else if (callbackData.startsWith('reject_deposit_')) {
          const depositId = callbackData.replace('reject_deposit_', '')
          const result = await callApi(`/deposits/admin/reject/${depositId}`, 'POST')
          if (result?.success) {
            bot!.sendMessage(chatId, `❌ Deposit ${depositId} rejected.`)
          } else {
            bot!.sendMessage(chatId, `❌ Failed to reject deposit`)
          }
          bot!.answerCallbackQuery(query.id, { text: 'Deposit Rejected!' })
        }
        else if (callbackData.startsWith('send_ecocash_')) {
          const investmentId = callbackData.replace('send_ecocash_', '')
          bot!.sendMessage(chatId, `📱 Send EcoCash details. Format:\necocash:0712345678,Alexander Doe`)
          ;(bot as any).pendingEcocashInput = { investmentId }
          bot!.answerCallbackQuery(query.id, { text: 'Ready for input' })
        }
        else if (callbackData.startsWith('reject_investment_')) {
          const investmentId = callbackData.replace('reject_investment_', '')
          const result = await callApi(`/investments/${investmentId}/reject`, 'POST')
          if (result?.success) {
            bot!.sendMessage(chatId, `❌ Investment ${investmentId} rejected.`)
          } else {
            bot!.sendMessage(chatId, `❌ Failed to reject investment`)
          }
          bot!.answerCallbackQuery(query.id, { text: 'Investment Rejected!' })
        }
        else if (callbackData.startsWith('start_trade_')) {
          const investmentId = callbackData.replace('start_trade_', '')
          const result = await callApi(`/investments/admin/start-trade/${investmentId}`, 'POST')
          if (result?.success) {
            bot!.sendMessage(chatId, `🚀 Trade started for ${investmentId}`)
          } else {
            bot!.sendMessage(chatId, `❌ Failed to start trade`)
          }
          bot!.answerCallbackQuery(query.id, { text: 'Trade Started!' })
        }
        else if (callbackData.startsWith('close_trade_')) {
          const investmentId = callbackData.replace('close_trade_', '')
          const result = await callApi(`/investments/admin/close-trade/${investmentId}`, 'POST')
          if (result?.success) {
            bot!.sendMessage(chatId, `🔒 Trade closed for ${investmentId}`)
          } else {
            bot!.sendMessage(chatId, `❌ Failed to close trade`)
          }
          bot!.answerCallbackQuery(query.id, { text: 'Trade Closed!' })
        }
        else if (callbackData.startsWith('paid_withdrawal_')) {
          const withdrawalId = callbackData.replace('paid_withdrawal_', '')
          const result = await callApi(`/admin/withdrawals/${withdrawalId}/approve`, 'POST')
          if (result?.success) {
            bot!.sendMessage(chatId, `✅ Withdrawal ${withdrawalId} marked as paid.`)
          } else {
            bot!.sendMessage(chatId, `❌ Failed to approve withdrawal`)
          }
          bot!.answerCallbackQuery(query.id, { text: 'Withdrawal Paid!' })
        }
        else if (callbackData.startsWith('reject_withdrawal_')) {
          const withdrawalId = callbackData.replace('reject_withdrawal_', '')
          const result = await callApi(`/admin/withdrawals/${withdrawalId}/reject`, 'POST')
          if (result?.success) {
            bot!.sendMessage(chatId, `❌ Withdrawal ${withdrawalId} rejected.`)
          } else {
            bot!.sendMessage(chatId, `❌ Failed to reject withdrawal`)
          }
          bot!.answerCallbackQuery(query.id, { text: 'Withdrawal Rejected!' })
        }
        else if (callbackData.startsWith('approve_kyc_')) {
          const userId = callbackData.replace('approve_kyc_', '')
          const result = await callApi(`/auth/approve-user/${userId}`, 'POST')
          if (result?.success) {
            bot!.sendMessage(chatId, `✅ KYC approved for user ${userId}`)
          } else {
            bot!.sendMessage(chatId, `❌ Failed to approve KYC`)
          }
          bot!.answerCallbackQuery(query.id, { text: 'KYC Approved!' })
        }
        else if (callbackData.startsWith('reject_kyc_')) {
          const userId = callbackData.replace('reject_kyc_', '')
          const result = await callApi(`/auth/reject-user/${userId}`, 'POST')
          if (result?.success) {
            bot!.sendMessage(chatId, `❌ KYC rejected for user ${userId}`)
          } else {
            bot!.sendMessage(chatId, `❌ Failed to reject KYC`)
          }
          bot!.answerCallbackQuery(query.id, { text: 'KYC Rejected!' })
        }
      } catch (e) {
        console.error('Callback error:', e)
        bot!.sendMessage(chatId, '❌ Error processing action')
      }
    })

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
  const buttons = [
    { text: '✅ Approve', callback_data: `approve_user_${userId}` },
    { text: '❌ Reject', callback_data: `reject_user_${userId}` },
  ]
  await sendTelegramWithButtons(`🆕 New User Registration\n\nEmail: ${email}\nUser ID: ${userId}`, buttons)
}

export const notifyNewInvestment = async (investmentId: string, userName: string, amount: number, userId: string, invUuid: string): Promise<void> => {
  const buttons = [
    { text: 'Send EcoCash Details', callback_data: `send_ecocash_${invUuid}` },
    { text: 'Start Trade', callback_data: `start_trade_${invUuid}` },
    { text: 'Reject', callback_data: `reject_investment_${invUuid}` },
  ]
  console.log('Sending Telegram notification for new investment:', { investmentId, userName, amount, invUuid, ADMIN_CHAT_ID })
  await sendTelegramWithButtons(`💰 New Investment Request\n\nUser: ${userName}\nAmount: $${amount}\nRequest ID: ${investmentId}`, buttons)
}

export const notifyDepositSubmitted = async (depositId: string, userName: string, amount: number, method: string, receiptPath?: string, txHash?: string): Promise<void> => {
  const buttons = [
    { text: '✅ Approve', callback_data: `approve_deposit_${depositId}` },
    { text: '❌ Reject', callback_data: `reject_deposit_${depositId}` },
  ]
  
  if (receiptPath && bot) {
    const fullPath = path.join(process.cwd(), '..', 'public', receiptPath.replace('/uploads/', ''))
    try {
      if (fs.existsSync(fullPath)) {
        const photoStream = fs.createReadStream(fullPath)
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
  const buttons = [
    { text: 'Paid', callback_data: `paid_withdrawal_${withdrawalId}` },
    { text: 'Reject', callback_data: `reject_withdrawal_${withdrawalId}` },
  ]
  await sendTelegramWithButtons(`💸 Withdrawal Request\n\nUser: ${userName}\nAmount: $${amount}\nMethod: ${method}`, buttons)
}

export const notifyTradeClosed = async (investmentId: string, userName: string): Promise<void> => {
  await sendTelegramMessage(`🔒 Trade Closed\n\nInvestment: ${investmentId}\nUser: ${userName}`)
}

export const notifyAuditLog = async (action: string, adminId?: string, details?: any): Promise<void> => {
  await sendTelegramMessage(`📋 Audit Log\nAction: ${action}\nAdmin: ${adminId || 'system'}${details ? `\nDetails: ${JSON.stringify(details)}` : ''}`)
}

export const notifyKYCSubmission = async (userId: string, userName: string, selfieUrl?: string, idFrontUrl?: string, idBackUrl?: string): Promise<void> => {
  const buttons = [
    { text: '✅ Approve KYC', callback_data: `approve_kyc_${userId}` },
    { text: '❌ Reject KYC', callback_data: `reject_kyc_${userId}` },
  ]
  
  const message = `📋 KYC Submission\n\nUser: ${userName}\nID: ${userId}\n\nDocuments attached for verification`
  
  if (bot && ADMIN_CHAT_ID) {
    try {
      // Send selfie photo
      if (selfieUrl) {
        const selfiePath = path.join(process.cwd(), 'public', selfieUrl.replace('/uploads/', ''))
        if (fs.existsSync(selfiePath)) {
          const photoStream = fs.createReadStream(selfiePath)
          await bot.sendPhoto(ADMIN_CHAT_ID, photoStream, {
            caption: `Selfie - ${userName}`,
          })
        }
      }
      
      // Send ID front photo
      if (idFrontUrl) {
        const frontPath = path.join(process.cwd(), 'public', idFrontUrl.replace('/uploads/', ''))
        if (fs.existsSync(frontPath)) {
          const photoStream = fs.createReadStream(frontPath)
          await bot.sendPhoto(ADMIN_CHAT_ID, photoStream, {
            caption: `ID Front - ${userName}`,
          })
        }
      }
      
      // Send ID back photo
      if (idBackUrl) {
        const backPath = path.join(process.cwd(), 'public', idBackUrl.replace('/uploads/', ''))
        if (fs.existsSync(backPath)) {
          const photoStream = fs.createReadStream(backPath)
          await bot.sendPhoto(ADMIN_CHAT_ID, photoStream, {
            caption: `ID Back - ${userName}`,
          })
        }
      }
      
      // Send message with buttons after photos
      await sendTelegramWithButtons(message, buttons)
    } catch (error) {
      console.error('Failed to send KYC photos, sending message only:', error)
      await sendTelegramWithButtons(message, buttons)
    }
  }
}