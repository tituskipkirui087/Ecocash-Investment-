import { Router, Request, Response, NextFunction } from 'express'
import { register, login, approveUser, rejectUser, getPendingUsers, getProfile, updateProfile, uploadAvatar, submitKYC } from '../controllers/authController.js'
import { authenticateToken } from '../middleware/auth.js'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Create uploads directory if it doesn't exist (for local development)
const kycUploadDir = process.env.VERCEL ? '/tmp/uploads/kyc' : path.join(__dirname, '../../public/uploads/kyc')
const avatarUploadDir = process.env.VERCEL ? '/tmp/uploads/avatars' : path.join(__dirname, '../../public/uploads/avatars')

try {
  fs.mkdirSync(kycUploadDir, { recursive: true })
  fs.mkdirSync(avatarUploadDir, { recursive: true })
} catch (err) {
  console.error('Failed to create upload directories:', err)
}

const router = Router()

const avatarStorage = multer.diskStorage({
  destination: avatarUploadDir,
  filename: (_, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  },
})

const kycStorage = multer.diskStorage({
  destination: kycUploadDir,
  filename: (_, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  },
})

const avatarUpload = multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } })
const kycUpload = multer({ storage: kycStorage, limits: { fileSize: 5 * 1024 * 1024 } })

const botSecret = process.env.BOT_SECRET || 'ecocash_bot_secret_2024'

const botAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const secret = req.headers['x-bot-secret']
  if (secret === botSecret) {
    next()
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized bot access' })
  }
}

router.post('/register', register)
router.post('/login', login)

router.post('/approve-user/:userId', botAuthMiddleware, approveUser)
router.post('/reject-user/:userId', botAuthMiddleware, rejectUser)
router.get('/pending-users', botAuthMiddleware, getPendingUsers)

router.get('/profile', authenticateToken, getProfile)
router.put('/profile', authenticateToken, updateProfile)
router.post('/avatar', authenticateToken, avatarUpload.single('avatar'), uploadAvatar)
router.post('/kyc', authenticateToken, kycUpload.fields([
  { name: 'idDocumentFront', maxCount: 1 },
  { name: 'idDocumentBack', maxCount: 1 },
  { name: 'selfie', maxCount: 1 }
]), submitKYC)

export default router