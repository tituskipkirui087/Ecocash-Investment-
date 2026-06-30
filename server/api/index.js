import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const PRISMA_DATABASE_URL = process.env.DATABASE_URL || 
  `postgresql://postgres:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST?.replace('db.', '')?.replace(':5432', '')}6543/postgres?pgbouncer=true`;

const prisma = new PrismaClient({
  datasources: { db: { url: PRISMA_DATABASE_URL } }
});

export default async function handler(req, res) {
  const { method, url } = req;
  const path = url.split('?')[0];

  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (method === 'OPTIONS') return res.status(200).end();

  if (path === '/api/health') {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  let body = {};
  if (req.body) {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }

  try {
    await prisma.$connect();

    if (path === '/api/investments/plans') {
      const plans = await prisma.investmentPlan.findMany();
      await prisma.$disconnect();
      return res.json({ success: true, data: plans });
    }

    if (path === '/api/deposits' && method === 'GET') {
      const deposits = await prisma.deposit.findMany({ orderBy: { createdAt: 'desc' } });
      await prisma.$disconnect();
      return res.json({ success: true, data: deposits });
    }

    if (path === '/api/auth/register' && method === 'POST') {
      const schema = z.object({ email: z.string().email(), password: z.string().min(6), firstName: z.string().min(1), lastName: z.string().min(1) });
      const parsed = schema.parse(body);
      const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
      if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });
      const user = await prisma.user.create({
        data: { ...parsed, password: await bcrypt.hash(parsed.password, 10), isVerified: false, isActive: false },
        select: { id: true, email: true, firstName: true, lastName: true, isVerified: true, role: true, createdAt: true }
      });
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({ success: true, message: 'Registration successful!', data: { user, token } });
    }

    if (path === '/api/auth/login' && method === 'POST') {
      const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
      const parsed = schema.parse(body);
      const user = await prisma.user.findUnique({ where: { email: parsed.email } });
      if (!user || !(await bcrypt.compare(parsed.password, user.password))) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      if (!user.isActive) return res.status(403).json({ success: false, message: 'Account pending approval' });
      const { password, ...u } = user;
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({ success: true, message: 'Login successful', data: { user: u, token } });
    }

    if (path === '/api/deposits/submit' && method === 'POST') {
      const deposit = await prisma.deposit.create({ data: { amount: parseFloat(body.amount), status: 'PAYMENT_SUBMITTED' } });
      return res.json({ success: true, data: deposit });
    }

    return res.status(404).json({ success: false, message: 'Route not found' });
  } catch (err) {
    const e = err;
    if (e instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: e.errors });
    if (err.message?.includes('connect')) {
      return res.status(503).json({ success: false, message: 'Database unavailable', error: err.message });
    }
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  } finally {
    try { await prisma.$disconnect(); } catch {}
  }
}