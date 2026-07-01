import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

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

export const config = {
  api: {
    bodyParser: false,
  },
}

function getRawBody(readable) {
  return new Promise((resolve, reject) => {
    const chunks = []
    readable.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    readable.on('end', () => resolve(Buffer.concat(chunks)))
    readable.on('error', reject)
  })
}

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' })

  // Get token
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

  // Get raw body as buffer
  const rawBody = await getRawBody(req)
  
  // Parse multipart form data using Busboy
  const Busboy = require('busboy')
  const busboy = Busboy({ headers: req.headers })
  
  const fields = {}
  const fileUploads = {}

  busboy.on('field', (fieldname, val) => {
    fields[fieldname] = val
  })

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    const fileChunks = []
    file.on('data', data => fileChunks.push(data))
    file.on('end', () => {
      fileUploads[fieldname] = {
        filename,
        mimeType: mimetype,
        data: Buffer.concat(fileChunks)
      }
    })
  })

  await new Promise((resolve, reject) => {
    busboy.on('finish', resolve)
    busboy.on('error', (err) => {
      console.error('Busboy error:', err)
      reject(err)
    })
    busboy.end(rawBody)
  })

  const { fullNameLegal, dateOfBirth, residentialAddress, country, idDocumentType, idDocumentNumber } = fields
  const idDocumentFront = fileUploads['idDocumentFront']
  const selfie = fileUploads['selfie']
  
  if (!idDocumentFront || !selfie) {
    return res.status(400).json({ 
      success: false, 
      message: 'ID front and selfie are required', 
      receivedFields: { fullNameLegal, dateOfBirth, residentialAddress, country, idDocumentType, idDocumentNumber },
      filesReceived: Object.keys(fileUploads) 
    })
  }

  let idFrontUrl = null
  let selfieUrl = null
  let idBackUrl = null
  
  try {
    // Upload files to Supabase Storage
    const { data: frontData, error: frontErr } = await supabase.storage
      .from('kyc')
      .upload(`front-${Date.now()}-${decoded.id}`, idDocumentFront.data, { contentType: idDocumentFront.mimeType })
    if (!frontErr) {
      idFrontUrl = `${supabaseUrl}/storage/v1/object/public/kyc/${frontData.path}`
    } else {
      console.error('Front upload error:', frontErr)
    }
    
    const { data: selfieData, error: selfieErr } = await supabase.storage
      .from('kyc')
      .upload(`selfie-${Date.now()}-${decoded.id}`, selfie.data, { contentType: selfie.mimeType })
    if (!selfieErr) {
      selfieUrl = `${supabaseUrl}/storage/v1/object/public/kyc/${selfieData.path}`
    } else {
      console.error('Selfie upload error:', selfieErr)
    }
    
    if (fileUploads['idDocumentBack']) {
      const backFile = fileUploads['idDocumentBack']
      const { data: backData, error: backErr } = await supabase.storage
        .from('kyc')
        .upload(`back-${Date.now()}-${decoded.id}`, backFile.data, { contentType: backFile.mimeType })
      if (!backErr) {
        idBackUrl = `${supabaseUrl}/storage/v1/object/public/kyc/${backData.path}`
      } else {
        console.error('Back upload error:', backErr)
      }
    }
    
    console.log('KYC file uploads:', { front: !!idFrontUrl, selfie: !!selfieUrl, back: !!idBackUrl })
  } catch (uploadErr) {
    console.error('File upload error:', uploadErr)
  }

  // Update user KYC data
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
  
  // Send Telegram notification
  const bot = await initTelegramBot()
  const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || ''
  const buttons = [
    { text: '✅ Approve KYC', callback_data: `approve_kyc_${decoded.id}` },
    { text: '❌ Reject KYC', callback_data: `reject_kyc_${decoded.id}` }
  ]
  const markup = { inline_keyboard: buttons.map((btn) => [{ text: btn.text, callback_data: btn.callback_data }]) }
  await sendTelegramMessage(bot, ADMIN_CHAT_ID, `📋 KYC Submission\n\nUser: ${decoded.email}\nStatus: Submitted for review`, markup)
  
  return res.json({ success: true, message: 'KYC submitted successfully', data: kyc })
}