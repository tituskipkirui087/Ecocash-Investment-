import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import TelegramBot from 'node-telegram-bot-api'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || ''
const BOT_SECRET = process.env.BOT_SECRET || 'ecocash_bot_secret_2024'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SECRET_KEY || 
                   process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const router = Router()

router.post('/webhook', async (req, res) => {
  try {
    const body = req.body

    if (body.message && body.message.text) {
      const chatId = body.message.chat.id
      const text = body.message.text

      if (text === '/start') {
        await sendMessage(chatId, 'Welcome to EcoCash Investment Bot\n\nCommands:\n/pending - View pending actions\n/users - List all users\n/investments - List investments')
      } else if (text === '/pending') {
        const { data: pending } = supabase
          ? await supabase.from('deposits').select('*, user:users(*)').eq('status', 'WAITING_FOR_PAYMENT_DETAILS').limit(5)
          : { data: null }
        const msg = pending?.length 
          ? `Pending Approvals:\n${pending.map((d: any) => `- ${d.user?.email}: $${d.amount}`).join('\n')}`
          : 'No pending actions.'
        await sendMessage(chatId, msg)
      } else if (text.startsWith('ecocash:')) {
        // Format: ecocash:number,accountName,reference,depositId
        const parts = text.substring(8).split(',')
        if (parts.length >= 4) {
          const [, number, accountName, reference, depositId] = parts
          if (supabase) {
            const { data: deposit } = await supabase
              .from('deposits')
              .update({
                ecocash_number: number,
                ecocash_account_name: accountName,
                ecocash_reference: reference,
                status: 'PAYMENT_DETAILS_SENT'
              })
              .eq('id', depositId)
              .select('*, user:users(*)')
              .single()
            
            if (deposit?.user?.telegram_chat_id) {
              await sendMessage(Number(deposit.user.telegram_chat_id), 
                `💰 Payment Details Received!\n\nEcoCash Number: ${number}\nAccount Name: ${accountName}\nReference: ${reference}\n\nPlease make the payment and upload proof.`)
            }
            await sendMessage(chatId, '✅ Payment details sent to user!')
          }
        }
      }
    }

    if (body.callback_query) {
      const callbackQuery = body.callback_query
      const callbackData = callbackQuery.data
      const chatId = callbackQuery.message.chat.id

      // Handle all callback actions
      if (callbackData.startsWith('approve_user_')) {
        const userId = callbackData.replace('approve_user_', '')
        await handleApproveUser(userId, chatId)
      } else if (callbackData.startsWith('reject_user_')) {
        const userId = callbackData.replace('reject_user_', '')
        await handleRejectUser(userId, chatId)
      } else if (callbackData.startsWith('approve_kyc_')) {
        const userId = callbackData.replace('approve_kyc_', '')
        await handleApproveKYC(userId, chatId)
      } else if (callbackData.startsWith('reject_kyc_')) {
        const userId = callbackData.replace('reject_kyc_', '')
        await handleRejectKYC(userId, chatId)
      } else if (callbackData.startsWith('send_details_')) {
        const depositId = callbackData.replace('send_details_', '')
        await sendMessage(chatId, `📱 Send EcoCash details. Format:\necocash:number,accountName,reference,${depositId}`)
      } else if (callbackData.startsWith('approve_deposit_')) {
        const depositId = callbackData.replace('approve_deposit_', '')
        await handleApproveDeposit(depositId, chatId)
      } else if (callbackData.startsWith('reject_deposit_')) {
        const depositId = callbackData.replace('reject_deposit_', '')
        await handleRejectDeposit(depositId, chatId)
      } else if (callbackData.startsWith('confirm_payment_')) {
        const depositId = callbackData.replace('confirm_payment_', '')
        await handleApproveDeposit(depositId, chatId)
      } else if (callbackData.startsWith('reject_payment_')) {
        const depositId = callbackData.replace('reject_payment_', '')
        await handleRejectDeposit(depositId, chatId)
      } else if (callbackData.startsWith('start_trade_')) {
        const investmentId = callbackData.replace('start_trade_', '')
        await handleStartTrade(investmentId, chatId)
      } else if (callbackData.startsWith('approve_investment_')) {
        const investmentId = callbackData.replace('approve_investment_', '')
        await sendMessage(chatId, `Investment ${investmentId} approved via webhook.`)
      } else if (callbackData.startsWith('reject_investment_')) {
        const investmentId = callbackData.replace('reject_investment_', '')
        await sendMessage(chatId, `Investment ${investmentId} rejected via webhook.`)
      } else if (callbackData.startsWith('paid_withdrawal_')) {
        const withdrawalId = callbackData.replace('paid_withdrawal_', '')
        await handlePaidWithdrawal(withdrawalId, chatId)
      } else if (callbackData.startsWith('reject_withdrawal_')) {
        const withdrawalId = callbackData.replace('reject_withdrawal_', '')
        await handleRejectWithdrawal(withdrawalId, chatId)
      }
    }

    res.sendStatus(200)
  } catch (error) {
    console.error('Telegram webhook error:', error)
    res.sendStatus(200)
  }
})

const sendMessage = async (chatId: number, text: string) => {
  if (!BOT_TOKEN) return
  try {
    const bot = new TelegramBot(BOT_TOKEN, { polling: false })
    await bot.sendMessage(chatId, text)
  } catch (error) {
    console.error('Send message error:', error)
  }
}

const handleApproveUser = async (userId: string, adminChatId: number) => {
  if (!supabase) return
  try {
    const { data: user } = await supabase
      .from('users')
      .update({ is_active: true })
      .eq('id', userId)
      .select()
      .single()
    
    if (user?.telegram_chat_id) {
      await sendMessage(Number(user.telegram_chat_id), 
        `🎉 Congratulations! Your account has been approved. You can now log in and start investing.`)
    }
    await sendMessage(adminChatId, '✅ User approved and notified!')
  } catch (error) {
    console.error('Approve user error:', error)
    await sendMessage(adminChatId, '❌ Failed to approve user.')
  }
}

const handleRejectUser = async (userId: string, adminChatId: number) => {
  await sendMessage(adminChatId, 'User rejected.')
}

const handleApproveKYC = async (userId: string, adminChatId: number) => {
  if (!supabase) return
  try {
    const { data: user } = await supabase
      .from('users')
      .update({ kyc_status: 'APPROVED', is_verified: true })
      .eq('id', userId)
      .select()
      .single()
    
    if (user?.telegram_chat_id) {
      await sendMessage(Number(user.telegram_chat_id), 
        `✅ KYC Approved! Your account is now fully verified and you can make investments.`)
    }
    await sendMessage(adminChatId, '✅ KYC approved and notified!')
  } catch (error) {
    console.error('Approve KYC error:', error)
    await sendMessage(adminChatId, '❌ Failed to approve KYC.')
  }
}

const handleRejectKYC = async (userId: string, adminChatId: number) => {
  if (!supabase) return
  try {
    const { data: user } = await supabase
      .from('users')
      .update({ kyc_status: 'REJECTED' })
      .eq('id', userId)
      .select()
      .single()
    
    if (user?.telegram_chat_id) {
      await sendMessage(Number(user.telegram_chat_id), 
        `❌ Your KYC submission was rejected. Please check your documents and resubmit.`)
    }
    await sendMessage(adminChatId, '✅ KYC rejected and notified!')
  } catch (error) {
    console.error('Reject KYC error:', error)
    await sendMessage(adminChatId, '❌ Failed to reject KYC.')
  }
}

const handleApproveDeposit = async (depositId: string, adminChatId: number) => {
  if (!supabase) return
  try {
    const { data: deposit } = await supabase
      .from('deposits')
      .update({ status: 'PAYMENT_RECEIVED' })
      .eq('id', depositId)
      .select('*, user:users(*), investments(*)')
      .single()
    
    if (deposit?.investment_id) {
      await supabase
        .from('investments')
        .update({ status: 'PAYMENT_RECEIVED' })
        .eq('id', deposit.investment_id)
    }
    
    if (deposit?.user?.telegram_chat_id) {
      await sendMessage(Number(deposit.user.telegram_chat_id), 
        `✅ Payment confirmed! Your investment is now active.\n\nInvestment: #${deposit.investments?.[0]?.investment_id || 'N/A'}`)
    }
    await sendMessage(adminChatId, '✅ Payment approved and user notified!')
  } catch (error) {
    console.error('Approve deposit error:', error)
    await sendMessage(adminChatId, '❌ Failed to approve payment.')
  }
}

const handleRejectDeposit = async (depositId: string, adminChatId: number) => {
  if (!supabase) return
  try {
    const { data: deposit } = await supabase
      .from('deposits')
      .update({ status: 'REJECTED' })
      .eq('id', depositId)
      .select('*, user:users(*), investments(*)')
      .single()
    
    if (deposit?.investment_id) {
      await supabase
        .from('investments')
        .update({ status: 'REJECTED' })
        .eq('id', deposit.investment_id)
    }
    
    if (deposit?.user?.telegram_chat_id) {
      await sendMessage(Number(deposit.user.telegram_chat_id), 
        `❌ Your payment was rejected. Please contact support for assistance.`)
    }
    await sendMessage(adminChatId, '✅ Payment rejected and user notified!')
  } catch (error) {
    console.error('Reject deposit error:', error)
    await sendMessage(adminChatId, '❌ Failed to reject payment.')
  }
}

const handleStartTrade = async (investmentId: string, adminChatId: number) => {
  if (!supabase) return
  try {
    const { data: investment } = await supabase
      .from('investments')
      .select('*, plan:investment_plans(*), user:users(*)')
      .eq('id', investmentId)
      .single()
    
    const tradeStart = new Date()
    const tradeEnd = new Date(tradeStart.getTime() + (investment.plan?.trade_duration_hours || 6) * 60 * 60 * 1000)
    
    await supabase
      .from('investments')
      .update({
        status: 'ACTIVE_TRADE',
        trade_start_date: tradeStart.toISOString(),
        trade_end_date: tradeEnd.toISOString()
      })
      .eq('id', investmentId)
    
    if (investment.user?.telegram_chat_id) {
      await sendMessage(Number(investment.user.telegram_chat_id), 
        `🚀 Your investment #${investment.investment_id} is now trading!\n\nAmount: $${investment.deposit_amount}\nDuration: ${investment.plan?.trade_duration_hours || 6}h\nExpected Return: $${(investment.deposit_amount * (investment.plan?.return_multiplier || 1)).toFixed(2)}`)
    }
    await sendMessage(adminChatId, '✅ Trade started and user notified!')
  } catch (error) {
    console.error('Start trade error:', error)
    await sendMessage(adminChatId, '❌ Failed to start trade.')
  }
}

const handlePaidWithdrawal = async (withdrawalId: string, adminChatId: number) => {
  if (!supabase) return
  try {
    const { data: withdrawal } = await supabase
      .from('withdrawals')
      .update({ status: 'PAID' })
      .eq('id', withdrawalId)
      .select('*, user:users(*)')
      .single()
    
    if (withdrawal?.user?.telegram_chat_id) {
      await sendMessage(Number(withdrawal.user.telegram_chat_id), 
        `💸 Your withdrawal has been processed! Amount: $${withdrawal.amount}`)
    }
    await sendMessage(adminChatId, '✅ Withdrawal processed and user notified!')
  } catch (error) {
    console.error('Paid withdrawal error:', error)
    await sendMessage(adminChatId, '❌ Failed to process withdrawal.')
  }
}

const handleRejectWithdrawal = async (withdrawalId: string, adminChatId: number) => {
  await sendMessage(adminChatId, 'Withdrawal rejected.')
}

export default router