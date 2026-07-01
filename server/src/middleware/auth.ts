import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../config/db.js'

interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
    firstName?: string
    lastName?: string
  }
}

export { AuthRequest }

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    res.status(401).json({ success: false, message: 'Access token required' })
    return
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, isActive: true, isVerified: true, firstName: true, lastName: true },
    })

    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' })
      return
    }

    req.user = user
    next()
  } catch (error) {
    res.status(403).json({ success: false, message: 'Invalid or expired token' })
  }
}

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Admin access required' })
    return
  }
  next()
}

export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body)
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        })
        return
      }
      next()
    }
  }
}

export const requireParam = (param: string): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.params[param]) {
      res.status(400).json({ success: false, message: `${param} is required` })
      return
    }
    next()
  }
}

export const getClientIp = (req: Request): string => {
  return (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown'
}