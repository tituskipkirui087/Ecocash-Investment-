import { prisma } from '../config/db.js';
import { notifyAuditLog } from '../services/telegramService.js';
import bcrypt from 'bcryptjs';
export const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await prisma.user.count({ where: { role: 'INVESTOR' } });
        const totalInvestments = await prisma.investment.count();
        const activeTrades = await prisma.investment.count({
            where: {
                OR: [
                    { status: 'ACTIVE_TRADE' },
                    { status: 'PAYMENT_RECEIVED' }
                ]
            }
        });
        const pendingDeposits = await prisma.deposit.count({ where: { status: 'PAYMENT_SUBMITTED' } });
        const pendingWithdrawals = await prisma.withdrawal.count({ where: { status: 'WITHDRAWAL_PENDING' } });
        const totalDeposited = await prisma.deposit.aggregate({
            where: { status: 'PAYMENT_RECEIVED' },
            _sum: { amount: true },
        });
        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                totalInvestments,
                activeTrades,
                pendingDeposits,
                pendingWithdrawals,
                totalDeposited: totalDeposited._sum.amount || 0,
            },
        });
    }
    catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { role: 'INVESTOR' },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                isVerified: true,
                isActive: true,
                createdAt: true,
                _count: { select: { investments: true, deposits: true, withdrawals: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({ success: true, data: users });
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const getAllInvestments = async (req, res) => {
    try {
        const { status } = req.query;
        const where = {};
        if (status)
            where.status = status;
        const investments = await prisma.investment.findMany({
            where,
            include: { user: true, deposits: true, withdrawals: true },
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({ success: true, data: investments });
    }
    catch (error) {
        console.error('Get all investments error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const getAllDeposits = async (req, res) => {
    try {
        const deposits = await prisma.deposit.findMany({
            include: { user: true, investment: true },
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({ success: true, data: deposits });
    }
    catch (error) {
        console.error('Get deposits error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const getAllWithdrawals = async (req, res) => {
    try {
        const withdrawals = await prisma.withdrawal.findMany({
            include: { user: true, investment: true },
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({ success: true, data: withdrawals });
    }
    catch (error) {
        console.error('Get withdrawals error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const getAuditLogs = async (req, res) => {
    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        res.status(200).json({ success: true, data: logs });
    }
    catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const user = await prisma.user.update({
            where: { id },
            data: { isActive },
        });
        await notifyAuditLog('User Status Updated', req.user.id, { userId: id, isActive });
        res.status(200).json({ success: true, message: 'User status updated', data: user });
    }
    catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const createAdmin = async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const admin = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                role: 'ADMIN',
                isVerified: true,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
            },
        });
        res.status(201).json({ success: true, message: 'Admin created', data: admin });
    }
    catch (error) {
        if (error.code === 'P2002') {
            res.status(400).json({ success: false, message: 'Email already exists' });
            return;
        }
        console.error('Create admin error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
