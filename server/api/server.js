import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { prisma } from './config/db.js';
import authRoutes from './routes/auth.js';
import investmentRoutes from './routes/investments.js';
import depositRoutes from './routes/deposits.js';
import withdrawalRoutes from './routes/withdrawals.js';
import adminRoutes from './routes/admin.js';
import telegramRoutes from './routes/telegram.js';
import notificationRoutes from './routes/notifications.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsPath = process.env.VERCEL
    ? '/tmp/uploads'
    : path.join(__dirname, '../../public/uploads');
const app = express();
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json());
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
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
        if (!global.sseClients)
            global.sseClients = [];
        global.sseClients.push({ userId: decoded.id, send: (data) => res.write(`data: ${data}\n\n`) });
        req.on('close', () => {
            global.sseClients = global.sseClients?.filter(c => c.userId !== decoded.id);
        });
    }
    catch (error) {
        res.status(401).end();
    }
});
app.use('/api/auth', authRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/notifications', notificationRoutes);
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});
if (!process.env.VERCEL && !process.env.NOW_REGION) {
    const PORT = process.env.PORT || 5000;
    prisma.$connect()
        .then(() => console.log('Database connected'))
        .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    })
        .catch((error) => {
        console.error('Server startup error:', error);
        process.exit(1);
    });
}
export default app;
export { prisma };
