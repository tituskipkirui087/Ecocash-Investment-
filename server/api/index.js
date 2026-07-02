import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import Busboy from 'busboy';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://xgotkgxnsupvdzsorlij.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || 
                   process.env.SUPABASE_SERVICE_ROLE_KEY || 
                   process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
                   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || ''

const initTelegramBot = async () => {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
    console.log('Telegram bot not configured - BOT_TOKEN:', !!BOT_TOKEN, 'ADMIN_CHAT_ID:', !!ADMIN_CHAT_ID)
    return null
  }
  
  try {
    const { default: TelegramBot } = await import('node-telegram-bot-api')
    const bot = new TelegramBot(BOT_TOKEN, { polling: false })
    console.log('Telegram bot initialized successfully')
    return bot
  } catch (error) {
    console.error('Telegram bot init error:', error)
    return null
  }
}

const sendTelegramMessage = async (bot, text, options = {}) => {
  if (!bot || !ADMIN_CHAT_ID) return
  try {
    await bot.sendMessage(ADMIN_CHAT_ID, text, options)
  } catch (error) {
    console.error('Telegram send error:', error)
  }
}

const sendTelegramPhoto = async (bot, imageUrl, caption, options = {}) => {
  if (!bot || !ADMIN_CHAT_ID) return
  try {
    await bot.sendPhoto(ADMIN_CHAT_ID, imageUrl, { caption, ...options })
  } catch (error) {
    console.error('Telegram photo send error:', error)
  }
}

export default async function handler(req, res) {
  const { method } = req;
  const url = req.url || '';
  const path = url.split('?')[0];

  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (method === 'OPTIONS') return res.status(200).end();

  console.log(`[${new Date().toISOString()}] ${method} ${path}`)

  if (path === '/health') {
    return res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString()
    });
  }

  const getUserId = (req) => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    try {
      const token = authHeader.substring(7)
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret')
      return decoded
    } catch (err) {
      return null
    }
  }

  // Handle KYC endpoint with multipart/form-data
  if (path === '/auth/kyc' && method === 'POST') {
    const decoded = getUserId(req)
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Authorization required' })
    }

    const chunks = []
    await new Promise((resolve, reject) => {
      req.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      })
      req.on('end', resolve)
      req.on('error', reject)
    })
    const rawBody = Buffer.concat(chunks)

    const fields = {}
    const files = {}
    await new Promise((resolve, reject) => {
      const busboy = Busboy({ headers: req.headers })
      busboy.on('field', (name, val) => fields[name] = val)
      busboy.on('file', (name, file, filename, encoding, mimetype) => {
        const fileChunks = []
        file.on('data', d => fileChunks.push(d))
        file.on('end', () => {
          files[name] = { filename, mimeType: mimetype, data: Buffer.concat(fileChunks) }
        })
      })
      busboy.on('finish', resolve)
      busboy.on('error', reject)
      busboy.end(rawBody)
    })

    const { fullNameLegal, dateOfBirth, residentialAddress, country, idDocumentType, idDocumentNumber } = fields
    const idDocumentFront = files['idDocumentFront']
    const selfie = files['selfie']
    const idDocumentBack = files['idDocumentBack']

    if (!idDocumentFront || !selfie) {
      return res.status(400).json({ success: false, message: 'ID front and selfie are required' })
    }

    let idFrontUrl = null, selfieUrl = null, idBackUrl = null

    try {
      if (supabase) {
        const timestamp = Date.now()
        const frontKey = `kyc/front-${timestamp}-${decoded.id}.${idDocumentFront.filename?.split('.').pop() || 'jpg'}`
        const selfieKey = `kyc/selfie-${timestamp}-${decoded.id}.${selfie.filename?.split('.').pop() || 'jpg'}`
        
        const { error: frontErr } = await supabase.storage
          .from('kyc')
          .upload(frontKey, idDocumentFront.data, { contentType: idDocumentFront.mimeType })
        if (!frontErr) idFrontUrl = `${supabaseUrl}/storage/v1/object/public/kyc/${frontKey}`

        const { error: selfieErr } = await supabase.storage
          .from('kyc')
          .upload(selfieKey, selfie.data, { contentType: selfie.mimeType })
        if (!selfieErr) selfieUrl = `${supabaseUrl}/storage/v1/object/public/kyc/${selfieKey}`

        if (idDocumentBack) {
          const backKey = `kyc/back-${timestamp}-${decoded.id}.${idDocumentBack.filename?.split('.').pop() || 'jpg'}`
          const { error: backErr } = await supabase.storage
            .from('kyc')
            .upload(backKey, idDocumentBack.data, { contentType: idDocumentBack.mimeType })
          if (!backErr) idBackUrl = `${supabaseUrl}/storage/v1/object/public/kyc/${backKey}`
        }
      }
    } catch (e) {
      console.error('Storage upload error (continuing without files):', e)
    }

    const { data: kyc, error } = await supabase
      .from('users')
      .update({
        full_name_legal: fullNameLegal,
        date_of_birth: dateOfBirth,
        residential_address: residentialAddress,
        country,
        id_document_type: idDocumentType,
        id_document_number: idDocumentNumber,
        id_document_front_url: idFrontUrl,
        selfie_url: selfieUrl,
        id_document_back_url: idBackUrl,
        kyc_status: 'SUBMITTED'
      })
      .eq('id', decoded.id)
      .select()
      .single()

    if (error) {
      console.error('KYC update error:', error)
      return res.status(500).json({ success: false, message: 'Failed to update KYC' })
    }

    // Telegram notification with images
    if (BOT_TOKEN && ADMIN_CHAT_ID) {
      try {
        const bot = await initTelegramBot()
        const buttons = [
          { text: '✅ Approve KYC', callback_data: `approve_kyc_${decoded.id}` },
          { text: '❌ Reject KYC', callback_data: `reject_kyc_${decoded.id}` }
        ]
        const markup = { inline_keyboard: buttons.map(b => [{ text: b.text, callback_data: b.callback_data }]) }
        await sendTelegramMessage(bot, `📋 KYC Submission\n\nUser: ${decoded.email}\nName: ${fullNameLegal || 'N/A'}`, markup)
        
        if (idFrontUrl) await sendTelegramPhoto(bot, idFrontUrl, `🪪 ID Front - User: ${decoded.email}`)
        if (selfieUrl) await sendTelegramPhoto(bot, selfieUrl, `🤳 Selfie - User: ${decoded.email}`)
        if (idBackUrl) await sendTelegramPhoto(bot, idBackUrl, `🪪 ID Back - User: ${decoded.email}`)
      } catch (e) {
        console.error('Telegram error:', e)
      }
    }

    return res.json({ success: true, message: 'KYC submitted successfully', data: kyc })
  }

  // Handle avatar upload with multipart/form-data
  if (path === '/auth/avatar' && method === 'POST') {
    const decoded = getUserId(req)
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Authorization required' })
    }

    const chunks = []
    await new Promise((resolve, reject) => {
      req.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      })
      req.on('end', resolve)
      req.on('error', reject)
    })
    const rawBody = Buffer.concat(chunks)

    const files = {}
    await new Promise((resolve, reject) => {
      const busboy = Busboy({ headers: req.headers })
      busboy.on('file', (name, file, filename, encoding, mimetype) => {
        const fileChunks = []
        file.on('data', d => fileChunks.push(d))
        file.on('end', () => {
          files[name] = { filename, mimeType: mimetype, data: Buffer.concat(fileChunks) }
        })
      })
      busboy.on('finish', resolve)
      busboy.on('error', reject)
      busboy.end(rawBody)
    })

    const avatar = files['avatar']
    if (!avatar) {
      return res.status(400).json({ success: false, message: 'Avatar image is required' })
    }

    let avatarUrl = null
    try {
      if (supabase) {
        // Try avatars bucket first, fallback to kyc
        const avatarKey = `kyc/avatar-${Date.now()}-${decoded.id}.${avatar.filename?.split('.').pop() || 'jpg'}`
        const { error } = await supabase.storage
          .from('kyc')
          .upload(avatarKey, avatar.data, { contentType: avatar.mimeType })
        if (!error) avatarUrl = `${supabaseUrl}/storage/v1/object/public/kyc/${avatarKey}`
      }
    } catch (e) {
      console.error('Avatar upload error:', e)
    }

    if (avatarUrl) {
      const { data: updatedUser } = await supabase
        .from('users')
        .update({ avatar: avatarUrl })
        .eq('id', decoded.id)
        .select('id, email, first_name, last_name, phone, avatar, is_verified, role, kyc_status')
        .single()
      return res.json({ success: true, message: 'Avatar updated', avatar: updatedUser?.avatar || avatarUrl })
    }
    return res.status(500).json({ success: false, message: 'Failed to upload avatar' })
  }

  // Handle payment proof upload with multipart/form-data
  if (path.match(/^\/deposits\/[^/]+\/upload-receipt$/) && method === 'POST') {
    const decoded = getUserId(req)
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Authorization required' })
    }

    const depositId = path.split('/')[2]
    
    const chunks = []
    await new Promise((resolve, reject) => {
      req.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      })
      req.on('end', resolve)
      req.on('error', reject)
    })
    const rawBody = Buffer.concat(chunks)

    const files = {}
    await new Promise((resolve, reject) => {
      const busboy = Busboy({ headers: req.headers })
      busboy.on('file', (name, file, filename, encoding, mimetype) => {
        const fileChunks = []
        file.on('data', d => fileChunks.push(d))
        file.on('end', () => {
          files[name] = { filename, mimeType: mimetype, data: Buffer.concat(fileChunks) }
        })
      })
      busboy.on('finish', resolve)
      busboy.on('error', reject)
      busboy.end(rawBody)
    })

    const receipt = files['receipt']
    if (!receipt) {
      return res.status(400).json({ success: false, message: 'Receipt is required' })
    }

    let receiptUrl = null
    try {
      if (supabase) {
        const receiptKey = `kyc/receipt-${Date.now()}-${decoded.id}.${receipt.filename?.split('.').pop() || 'jpg'}`
        const { error } = await supabase.storage
          .from('kyc')
          .upload(receiptKey, receipt.data, { contentType: receipt.mimeType })
        if (!error) receiptUrl = `${supabaseUrl}/storage/v1/object/public/kyc/${receiptKey}`
      }
    } catch (e) {
      console.error('Receipt upload error:', e)
    }

    const { data: updatedDeposit } = await supabase
      .from('deposits')
      .update({ 
        receipt_screenshot: receiptUrl,
        status: 'PAYMENT_SUBMITTED' 
      })
      .eq('id', depositId)
      .select()
      .single()

    // Notify admin via Telegram with receipt image
    if (BOT_TOKEN && ADMIN_CHAT_ID && receiptUrl) {
      try {
        const bot = await initTelegramBot()
        const buttons = [
          { text: '✅ Confirm Payment', callback_data: `confirm_payment_${depositId}` },
          { text: '❌ Reject Payment', callback_data: `reject_payment_${depositId}` }
        ]
        const markup = { inline_keyboard: buttons.map(b => [{ text: b.text, callback_data: b.callback_data }]) }
        await sendTelegramPhoto(bot, receiptUrl, `💰 Payment Proof Submitted\nDeposit ID: ${depositId}`, markup)
      } catch (e) {
        console.error('Telegram error:', e)
      }
    }

    return res.json({ success: true, message: 'Receipt submitted', data: updatedDeposit })
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  }

  try {
    // GET investments plans
    if (path === '/investments/plans' && method === 'GET') {
      const { data, error } = await supabase.from('investment_plans').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      return res.json({ success: true, data });
    }

    // POST create investment
    if (path === '/investments' && method === 'POST') {
      const decoded = getUserId(req)
      if (!decoded) {
        return res.status(401).json({ success: false, message: 'Authorization required' })
      }

      const schema = z.object({
        amount: z.number().positive(),
        planId: z.string().uuid(),
        paymentMethod: z.string().optional()
      })
      const parsed = schema.parse(body)

      // Create deposit first
      const { data: deposit, error: depositErr } = await supabase
        .from('deposits')
        .insert({
          user_id: decoded.id,
          amount: parsed.amount,
          payment_method: parsed.paymentMethod || 'ECOCASH',
          status: 'WAITING_FOR_PAYMENT_DETAILS'
        })
        .select()
        .single()

      if (depositErr) throw depositErr

      // Create investment linked to deposit
      const { data: investment, error: invErr } = await supabase
        .from('investments')
        .insert({
          user_id: decoded.id,
          plan_id: parsed.planId,
          deposit_amount: parsed.amount,
          current_balance: parsed.amount,
          status: 'PENDING',
          investment_id: `INV-${Date.now()}-${decoded.id.substring(0, 8)}`
        })
        .select()
        .single()

      if (invErr) throw invErr

      // Update deposit with investment id
      await supabase
        .from('deposits')
        .update({ investment_id: investment.id })
        .eq('id', deposit.id)

      // Notify admin via Telegram
      if (BOT_TOKEN && ADMIN_CHAT_ID) {
        try {
          const bot = await initTelegramBot()
          const buttons = [
            { text: '📤 Send Payment Details', callback_data: `send_details_${deposit.id}` }
          ]
          const markup = { inline_keyboard: buttons.map(b => [{ text: b.text, callback_data: b.callback_data }]) }
          await sendTelegramMessage(bot, `📈 New Investment Request\n\nUser: ${decoded.email}\nAmount: $${parsed.amount}\nDeposit ID: ${deposit.id}`, markup)
        } catch (e) {
          console.error('Telegram error:', e)
        }
      }

      return res.json({ success: true, message: 'Investment created', data: { investment, depositId: deposit.id } })
    }

    // GET user investments
    if (path === '/investments' && method === 'GET') {
      const decoded = getUserId(req)
      if (!decoded) {
        return res.status(401).json({ success: false, message: 'Authorization required' })
      }
      
      const { data, error } = await supabase
        .from('investments')
        .select('*, plan:investment_plans(*), deposits(*)')
        .eq('user_id', decoded.id)
        .order('created_at', { ascending: false })
      if (error) throw error;
      return res.json({ success: true, data });
    }

    // PUT start trade
    if (path.match(/^\/investments\/[^/]+\/start-trade$/) && method === 'PUT') {
      const decoded = getUserId(req)
      if (!decoded) {
        return res.status(401).json({ success: false, message: 'Authorization required' })
      }

      const investmentId = path.split('/')[2]
      
      const { data: investment, error: invErr } = await supabase
        .from('investments')
        .select('*, plan:investment_plans(*), deposits(*)')
        .eq('id', investmentId)
        .single()

      if (invErr) throw invErr

      const tradeStart = new Date()
      const tradeEnd = new Date(tradeStart.getTime() + (investment.plan?.trade_duration_hours || 6) * 60 * 60 * 1000)

      const { data: updated, error } = await supabase
        .from('investments')
        .update({
          status: 'ACTIVE_TRADE',
          trade_start_date: tradeStart.toISOString(),
          trade_end_date: tradeEnd.toISOString()
        })
        .eq('id', investmentId)
        .select()
        .single()

      if (error) throw error

      // Notify user via Telegram
      if (BOT_TOKEN && ADMIN_CHAT_ID && investment.user_id) {
        try {
          const { data: user } = await supabase
            .from('users')
            .select('telegram_chat_id')
            .eq('id', investment.user_id)
            .single()
          
          const bot = await initTelegramBot()
          if (user?.telegram_chat_id) {
            await sendTelegramMessage(bot, `🚀 Your investment #${investment.investment_id} is now trading!\n\nAmount: $${investment.deposit_amount}\nDuration: ${investment.plan?.trade_duration_hours}h\nExpected Return: ${(investment.deposit_amount * investment.plan?.return_multiplier).toFixed(2)}`)
          }
        } catch (e) {
          console.error('Telegram notification error:', e)
        }
      }

      return res.json({ success: true, message: 'Trade started', data: updated })
    }

    // GET deposits
    if (path === '/deposits' && method === 'GET') {
      const decoded = getUserId(req)
      if (!decoded) {
        return res.status(401).json({ success: false, message: 'Authorization required' })
      }
      
      const { data, error } = await supabase
        .from('deposits')
        .select('*, investment:investments(*)')
        .eq('user_id', decoded.id)
        .order('created_at', { ascending: false })
      if (error) throw error;
      return res.json({ success: true, data });
    }

    // GET user profile
    if (path === '/auth/profile' && method === 'GET') {
      const decoded = getUserId(req)
      if (!decoded) {
        return res.status(401).json({ success: false, message: 'Authorization required' })
      }
      
      const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, phone, avatar, is_verified, role, kyc_status')
        .eq('id', decoded.id)
        .single()
      if (error) throw error;
      return res.json({ success: true, data });
    }

    // PUT update user profile
    if (path === '/auth/profile' && method === 'PUT') {
      const decoded = getUserId(req)
      if (!decoded) {
        return res.status(401).json({ success: false, message: 'Authorization required' })
      }

      const { firstName, lastName, phone } = body

      const { data, error } = await supabase
        .from('users')
        .update({ 
          first_name: firstName,
          last_name: lastName,
          phone: phone
        })
        .eq('id', decoded.id)
        .select('id, email, first_name, last_name, phone, avatar, is_verified, role, kyc_status')
        .single()

      if (error) throw error
      return res.json({ success: true, message: 'Profile updated', data })
    }

    // PUT send payment details
    if (path.match(/^\/deposits\/[^/]+\/send-details$/) && method === 'PUT') {
      const decoded = getUserId(req)
      if (!decoded) {
        return res.status(401).json({ success: false, message: 'Authorization required' })
      }

      const depositId = path.split('/')[2]
      const { ecocashNumber, ecocashAccountName, ecocashReference } = body

      const { data: deposit, error } = await supabase
        .from('deposits')
        .update({
          ecocash_number: ecocashNumber,
          ecocash_account_name: ecocashAccountName,
          ecocash_reference: ecocashReference,
          status: 'PAYMENT_DETAILS_SENT'
        })
        .eq('id', depositId)
        .select('*, user:users(*)')
        .single()

      if (error) throw error

      // Notify user via Telegram if they have chat_id
      if (BOT_TOKEN && deposit.user?.telegram_chat_id) {
        try {
          const bot = await initTelegramBot()
          await sendTelegramMessage(bot, `💰 Payment Details for Your Investment\n\nEcoCash Number: ${ecocashNumber}\nAccount Name: ${ecocashAccountName}\nReference: ${ecocashReference || 'N/A'}\n\nPlease make the payment and click 'Have you paid?' to upload proof.`)
        } catch (e) {
          console.error('Telegram notification error:', e)
        }
      }

      return res.json({ success: true, message: 'Payment details sent', data: deposit })
    }

    // PUT approve deposit
    if (path.match(/^\/deposits\/[^/]+\/approve$/) && method === 'PUT') {
      const decoded = getUserId(req)
      if (!decoded) {
        return res.status(401).json({ success: false, message: 'Authorization required' })
      }

      const depositId = path.split('/')[2]

      const { data: deposit, error } = await supabase
        .from('deposits')
        .update({ status: 'PAYMENT_RECEIVED' })
        .eq('id', depositId)
        .select('*, user:users(*)')
        .single()

      if (error) throw error

      // Update investment status
      if (deposit.investment_id) {
        await supabase
          .from('investments')
          .update({ status: 'PAYMENT_RECEIVED' })
          .eq('id', deposit.investment_id)
      }

      // Notify user via Telegram
      if (BOT_TOKEN && deposit.user?.telegram_chat_id) {
        try {
          const bot = await initTelegramBot()
          await sendTelegramMessage(bot, `✅ Payment confirmed! Your investment is now active.\n\nInvestment: #${deposit.investments?.[0]?.investment_id || 'N/A'}`)
        } catch (e) {
          console.error('Telegram notification error:', e)
        }
      }

      return res.json({ success: true, message: 'Deposit approved', data: deposit })
    }

    // PUT reject deposit
    if (path.match(/^\/deposits\/[^/]+\/reject$/) && method === 'PUT') {
      const decoded = getUserId(req)
      if (!decoded) {
        return res.status(401).json({ success: false, message: 'Authorization required' })
      }

      const depositId = path.split('/')[2]

      const { data: deposit, error } = await supabase
        .from('deposits')
        .update({ status: 'REJECTED' })
        .eq('id', depositId)
        .select('*, user:users(*)')
        .single()

      if (error) throw error

      // Update investment status
      if (deposit.investment_id) {
        await supabase
          .from('investments')
          .update({ status: 'REJECTED' })
          .eq('id', deposit.investment_id)
      }

      return res.json({ success: true, message: 'Deposit rejected', data: deposit })
    }

    // Admin: GET deposits
    if (path === '/admin/deposits' && method === 'GET') {
      const { data, error } = await supabase
        .from('deposits')
        .select('*, user:users(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return res.json({ success: true, data })
    }

    // Admin: GET investments
    if (path === '/admin/investments' && method === 'GET') {
      const { data, error } = await supabase
        .from('investments')
        .select('*, user:users(*), plan:investment_plans(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return res.json({ success: true, data })
    }

    // Admin: GET dashboard stats
    if (path === '/admin/dashboard' && method === 'GET') {
      const [usersRes, investmentsRes, depositsRes, withdrawalsRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }),
        supabase.from('investments').select('id', { count: 'exact' }),
        supabase.from('deposits').select('id, amount').eq('status', 'WAITING_FOR_PAYMENT_DETAILS'),
        supabase.from('withdrawals').select('id', { count: 'exact' }).eq('status', 'WITHDRAWAL_PENDING')
      ])

      const totalDeposited = depositsRes.data?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0

      return res.json({
        success: true,
        data: {
          totalUsers: usersRes.count || 0,
          totalInvestments: investmentsRes.count || 0,
          activeTrades: 0,
          pendingDeposits: depositsRes.data?.length || 0,
          pendingWithdrawals: withdrawalsRes.count || 0,
          totalDeposited
        }
      })
    }

    // Admin: PUT approve user
    if (path.match(/^\/admin\/users\/[^/]+\/approve$/) && method === 'PUT') {
      const userId = path.split('/')[3]
      
      const { data: user, error } = await supabase
        .from('users')
        .update({ is_active: true })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error

      // Notify user via Telegram if chat_id exists
      if (BOT_TOKEN && user?.telegram_chat_id) {
        try {
          const bot = await initTelegramBot()
          await sendTelegramMessage(bot, `🎉 Congratulations! Your account has been approved. You can now log in and start investing.`)
        } catch (e) {
          console.error('Telegram notification error:', e)
        }
      }

      return res.json({ success: true, message: 'User approved', data: user })
    }

    // Admin: PUT approve KYC
    if (path.match(/^\/admin\/users\/[^/]+\/approve-kyc$/) && method === 'PUT') {
      const userId = path.split('/')[3]
      
      const { data: user, error } = await supabase
        .from('users')
        .update({ kyc_status: 'APPROVED', is_verified: true })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error

      // Notify user via Telegram
      if (BOT_TOKEN && user?.telegram_chat_id) {
        try {
          const bot = await initTelegramBot()
          await sendTelegramMessage(bot, `✅ KYC Approved! Your account is now fully verified and you can make investments.`)
        } catch (e) {
          console.error('Telegram notification error:', e)
        }
      }

      return res.json({ success: true, message: 'KYC approved', data: user })
    }

    // Admin: PUT reject KYC
    if (path.match(/^\/admin\/users\/[^/]+\/reject-kyc$/) && method === 'PUT') {
      const userId = path.split('/')[3]
      
      const { data: user, error } = await supabase
        .from('users')
        .update({ kyc_status: 'REJECTED' })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error

      // Notify user via Telegram
      if (BOT_TOKEN && user?.telegram_chat_id) {
        try {
          const bot = await initTelegramBot()
          await sendTelegramMessage(bot, `❌ Your KYC submission was rejected. Please check your documents and resubmit.`)
        } catch (e) {
          console.error('Telegram notification error:', e)
        }
      }

      return res.json({ success: true, message: 'KYC rejected', data: user })
    }

    // Admin: GET users
    if (path === '/admin/users' && method === 'GET') {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, phone, is_active, is_verified, kyc_status, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return res.json({ success: true, data })
    }

    if (path === '/auth/register' && method === 'POST') {
      const schema = z.object({ email: z.string().email(), password: z.string().min(6), firstName: z.string().min(1), lastName: z.string().min(1) });
      const parsed = schema.parse(body);
      
      const { data: existing } = await supabase.from('users').select('id').eq('email', parsed.email).single();
      if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });
      
      const { data: user, error: createError } = await supabase
        .from('users')
        .insert({ 
          email: parsed.email, 
          password: await bcrypt.hash(parsed.password, 10), 
          first_name: parsed.firstName,
          last_name: parsed.lastName,
          is_verified: false,
          is_active: false,
          role: 'INVESTOR'
        })
        .select('id, email, first_name, last_name, is_verified, role, created_at')
        .single();
      
      if (createError) throw createError;
      
      const bot = await initTelegramBot()
      const buttons = [
        { text: '✅ Approve', callback_data: `approve_user_${user.id}` },
        { text: '❌ Reject', callback_data: `reject_user_${user.id}` }
      ]
      const markup = { inline_keyboard: buttons.map((btn) => [{ text: btn.text, callback_data: btn.callback_data }]) }
      await sendTelegramMessage(bot, `🆕 New User Registration\n\nEmail: ${parsed.email}\nName: ${parsed.firstName} ${parsed.lastName}`, markup)
      
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
      return res.status(201).json({ success: true, message: 'Registration successful!', data: { user, token } });
    }

    if (path === '/auth/login' && method === 'POST') {
      const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
      const parsed = schema.parse(body);
      
      const { data: user, error } = await supabase.from('users').select('*').eq('email', parsed.email).single();
      if (error || !user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      if (!(await bcrypt.compare(parsed.password, user.password))) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      if (!user.is_active) return res.status(403).json({ success: false, message: 'Account pending approval' });
      
      const { password, ...u } = user;
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
      return res.json({ success: true, message: 'Login successful', data: { user: u, token } });
    }

    return res.status(404).json({ success: false, message: 'Route not found' });
  } catch (err) {
    const e = err;
    if (e instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: e.errors });
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
}