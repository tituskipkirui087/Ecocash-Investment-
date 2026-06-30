import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import TelegramBot from 'node-telegram-bot-api';

const prisma = new PrismaClient({ log: ['error'] });

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json());

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/sse/payment-updates', (req, res) => {
    const token = req.query.token;
    if (!token) {
        res.status(401).end();
        return;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        if (!global.sseClients) global.sseClients = [];
        global.sseClients.push({ userId: decoded.id, send: (data) => res.write(`data: ${data}\n\n`) });
        req.on('close', () => {
            global.sseClients = global.sseClients?.filter(c => c.userId !== decoded.id);
        });
        res.status(200);
    } catch (error) {
        res.status(401).end();
    }
});

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const validated = registerSchema.parse(req.body);
        const { email, password, firstName, lastName, phone } = validated;
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ success: false, message: 'Email already registered' });
            return;
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { email, password: hashedPassword, firstName, lastName, phone, isVerified: false, isActive: false },
            select: { id: true, email: true, firstName: true, lastName: true, phone: true, isVerified: true, role: true, createdAt: true }
        });
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ success: true, message: 'Registration successful!', data: { user, token } });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
            return;
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const validated = loginSchema.parse(req.body);
        const { email, password } = validated;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !await bcrypt.compare(password, user.password)) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }
        if (!user.isActive) {
            res.status(403).json({ success: false, message: 'Account pending approval' });
            return;
        }
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json({ success: true, message: 'Login successful', data: { user: userWithoutPassword, token } });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Validation error' });
    }
});

app.get('/api/investments/plans', async (_req, res) => {
    try {
        const plans = await prisma.investmentPlan.findMany();
        res.json({ success: true, data: plans });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/deposits', async (_req, res) => {
    try {
        const deposits = await prisma.deposit.findMany({ orderBy: { createdAt: 'desc' } });
        res.json({ success: true, data: deposits });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

export default async function handler(req, res) {
    await prisma.$connect();
    return new Promise((resolve, reject) => {
        app(req, res, (err) => {
            if (err) reject(err);
            else resolve(undefined);
        });
    });
}