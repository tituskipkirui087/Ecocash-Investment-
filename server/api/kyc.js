import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import Busboy from 'busboy';
import { buffer } from 'raw-body';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://xgotkgxnsupvdzsorlij.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || 
                   process.env.SUPABASE_SERVICE_ROLE_KEY || 
                   process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
                   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Access-Control-Max-Age', '86400')
  
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' })

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

  const rawBodyBuffer = await buffer(req)
  const fields = {}
  const files = {}

  await new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers })
    
    busboy.on('field', (fieldname, val) => {
      fields[fieldname] = val
    })

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      const fileChunks = []
      file.on('data', (data) => fileChunks.push(data))
      file.on('end', () => {
        files[fieldname] = {
          filename,
          mimeType: mimetype,
          data: Buffer.concat(fileChunks)
        }
      })
    })

    busboy.on('finish', resolve)
    busboy.on('error', reject)
    busboy.end(rawBodyBuffer)
  })

  const { fullNameLegal, dateOfBirth, residentialAddress, country, idDocumentType, idDocumentNumber } = fields
  const idDocumentFront = files['idDocumentFront']
  const selfie = files['selfie']
  
  if (!idDocumentFront || !selfie) {
    return res.status(400).json({ 
      success: false, 
      message: 'ID front and selfie are required', 
      receivedFields: { fullNameLegal, dateOfBirth, residentialAddress, country, idDocumentType, idDocumentNumber },
      filesReceived: Object.keys(files) 
    })
  }

  let idFrontUrl = null
  let selfieUrl = null
  let idBackUrl = null
  
  try {
    const { data: frontData, error: frontErr } = await supabase.storage
      .from('kyc')
      .upload(`front-${Date.now()}-${decoded.id}`, idDocumentFront.data, { contentType: idDocumentFront.mimeType })
    if (!frontErr) idFrontUrl = `${supabaseUrl}/storage/v1/object/public/kyc/${frontData.path}`
    
    const { data: selfieData, error: selfieErr } = await supabase.storage
      .from('kyc')
      .upload(`selfie-${Date.now()}-${decoded.id}`, selfie.data, { contentType: selfie.mimeType })
    if (!selfieErr) selfieUrl = `${supabaseUrl}/storage/v1/object/public/kyc/${selfieData.path}`
    
    if (files['idDocumentBack']) {
      const { data: backData, error: backErr } = await supabase.storage
        .from('kyc')
        .upload(`back-${Date.now()}-${decoded.id}`, files['idDocumentBack'].data, { contentType: files['idDocumentBack'].mimeType })
      if (!backErr) idBackUrl = `${supabaseUrl}/storage/v1/object/public/kyc/${backData.path}`
    }
  } catch (uploadErr) {
    console.error('File upload error:', uploadErr)
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
  
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
    const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || ''
    if (BOT_TOKEN && ADMIN_CHAT_ID) {
      const { default: TelegramBot } = await import('node-telegram-bot-api')
      const bot = new TelegramBot(BOT_TOKEN, { polling: false })
      const buttons = [
        { text: '✅ Approve KYC', callback_data: `approve_kyc_${decoded.id}` },
        { text: '❌ Reject KYC', callback_data: `reject_kyc_${decoded.id}` }
      ]
      const markup = { inline_keyboard: buttons.map((btn) => [{ text: btn.text, callback_data: btn.callback_data }]) }
      await bot.sendMessage(ADMIN_CHAT_ID, `📋 KYC Submission\n\nUser: ${decoded.email}\nStatus: Submitted for review`, markup)
    }
  } catch (teleErr) {
    console.error('Telegram notification error:', teleErr)
  }
  
  return res.json({ success: true, message: 'KYC submitted successfully', data: kyc })
}