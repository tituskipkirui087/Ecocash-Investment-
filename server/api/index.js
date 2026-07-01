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

export const initTelegramBot = async () => {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
  const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || ''
  
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

export const sendTelegramMessage = async (bot, ADMIN_CHAT_ID, text, options) => {
  if (!bot || !ADMIN_CHAT_ID) return
  try {
    await bot.sendMessage(ADMIN_CHAT_ID, text, options)
  } catch (error) {
    console.error('Telegram send error:', error)
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

  if (path === '/api/health') {
    return res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString()
    });
  }

  // Handle KYC endpoint with multipart/form-data
  if (path === '/api/auth/kyc' && method === 'POST') {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization required' })
    }
    const token = authHeader.substring(7)
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret')
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' })
    }

    // Get raw body for multipart parsing
    const chunks = []
    await new Promise((resolve, reject) => {
      req.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      })
      req.on('end', resolve)
      req.on('error', reject)
    })
    const rawBody = Buffer.concat(chunks)

    // Parse with Busboy
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

    if (!idDocumentFront || !selfie) {
      return res.status(400).json({ success: false, message: 'ID front and selfie are required' })
    }

    let idFrontUrl = null, selfieUrl = null, idBackUrl = null

    try {
      if (!supabase) throw new Error('Supabase not configured')
      const { error: frontErr } = await supabase.storage
        .from('kyc')
        .upload(`front-${Date.now()}-${decoded.id}`, idDocumentFront.data, { contentType: idDocumentFront.mimeType })
      if (!frontErr) idFrontUrl = `https://xgotkgxnsupvdzsorlij.supabase.co/storage/v1/object/public/kyc/front-${Date.now()}-${decoded.id}`

      const { error: selfieErr } = await supabase.storage
        .from('kyc')
        .upload(`selfie-${Date.now()}-${decoded.id}`, selfie.data, { contentType: selfie.mimeType })
      if (!selfieErr) selfieUrl = `https://xgotkgxnsupvdzsorlij.supabase.co/storage/v1/object/public/kyc/selfie-${Date.now()}-${decoded.id}`
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

    // Telegram notification
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID) {
      try {
        const { default: TelegramBot } = await import('node-telegram-bot-api')
        const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false })
        const buttons = [
          { text: '✅ Approve KYC', callback_data: `approve_kyc_${decoded.id}` },
          { text: '❌ Reject KYC', callback_data: `reject_kyc_${decoded.id}` }
        ]
        await bot.sendMessage(process.env.TELEGRAM_ADMIN_CHAT_ID, `📋 KYC Submission\n\nUser: ${decoded.email}`, {
          reply_markup: { inline_keyboard: buttons.map(b => [{ text: b.text, callback_data: b.callback_data }]) }
        })
      } catch (e) {
        console.error('Telegram error:', e)
      }
    }

    return res.json({ success: true, message: 'KYC submitted successfully', data: kyc })
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  }

  try {
    if (path === '/api/investments/plans') {
      const { data, error } = await supabase.from('investment_plans').select('*');
      if (error) throw error;
      return res.json({ success: true, data });
    }

    if (path === '/api/deposits' && method === 'GET') {
      const { data, error } = await supabase.from('deposits').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({ success: true, data });
    }

    if (path === '/api/auth/register' && method === 'POST') {
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
      const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || ''
      const buttons = [
        { text: '✅ Approve', callback_data: `approve_user_${user.id}` },
        { text: '❌ Reject', callback_data: `reject_user_${user.id}` }
      ]
      const markup = { inline_keyboard: buttons.map((btn) => [{ text: btn.text, callback_data: btn.callback_data }]) }
      await sendTelegramMessage(bot, ADMIN_CHAT_ID, `🆕 New User Registration\n\nEmail: ${parsed.email}\nName: ${parsed.firstName} ${parsed.lastName}`, markup)
      
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
      return res.status(201).json({ success: true, message: 'Registration successful!', data: { user, token } });
    }

    if (path === '/api/auth/login' && method === 'POST') {
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

    if (path === '/api/deposits/submit' && method === 'POST') {
      const { data, error } = await supabase
        .from('deposits')
        .insert({ amount: parseFloat(body.amount), status: 'PAYMENT_SUBMITTED', payment_method: 'ecocash' })
        .select()
        .single();
      if (error) throw error;
      return res.json({ success: true, data });
    }

    return res.status(404).json({ success: false, message: 'Route not found' });
  } catch (err) {
    const e = err;
    if (e instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: e.errors });
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
}