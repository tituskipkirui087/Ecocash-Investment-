import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const prisma = new PrismaClient({ log: ['error'] });
const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const registerSchema = z.object({ email: z.string().email(), password: z.string().min(6), firstName: z.string().min(1), lastName: z.string().min(1) });
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName } = registerSchema.parse(req.body);
        if (await prisma.user.findUnique({ where: { email } })) return res.status(400).json({ success: false, message: 'Email already registered' });
        const user = await prisma.user.create({
            data: { email, password: await bcrypt.hash(password, 10), firstName, lastName, isVerified: false, isActive: false },
            select: { id: true, email: true, firstName: true, lastName: true, isVerified: true, role: true, createdAt: true }
        });
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ success: true, message: 'Registration successful!', data: { user, token } });
    } catch (e) {
        const err = e;
        res.status(err instanceof z.ZodError ? 400 : 500).json({ success: false, message: 'Error', errors: err.errors });
    }
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !await bcrypt.compare(password, user.password)) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        if (!user.isActive) return res.status(403).json({ success: false, message: 'Account pending approval' });
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const { password: _, ...u } = user;
        res.json({ success: true, message: 'Login successful', data: { user: u, token } });
    } catch (err) { res.status(400).json({ success: false, message: 'Validation error' }); }
});

app.get('/api/investments/plans', async (_req, res) => {
    try { res.json({ success: true, data: await prisma.investmentPlan.findMany() }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

app.get('/api/deposits', async (_req, res) => {
    try { res.json({ success: true, data: await prisma.deposit.findMany({ orderBy: { createdAt: 'desc' } }) }); }
    catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

app.post('/api/deposits/submit', async (req, res) => {
    try {
        const { amount } = req.body;
        const deposit = await prisma.deposit.create({ data: { amount: parseFloat(amount), status: 'PAYMENT_SUBMITTED' } });
        res.json({ success: true, data: deposit });
    } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

export default async function handler(req, res) {
    await prisma.$connect();
    return new Promise((resolve, reject) => app(req, res, (err) => err ? reject(err) : resolve(undefined)));
}