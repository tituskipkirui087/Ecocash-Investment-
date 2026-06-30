import { prisma } from '../config/db.js';
import { generateInvestmentId } from '../utils/helpers.js';
import { notifyNewInvestment, notifyTradeClosed } from '../services/telegramService.js';
import { z } from 'zod';
const createInvestmentSchema = z.object({
    amount: z.number().min(100, 'Minimum investment is $100'),
    paymentMethod: z.enum(['ECOCASH']).default('ECOCASH'),
    planId: z.string().optional(),
});
export const getPlans = async (_req, res) => {
    try {
        const plans = await prisma.investmentPlan.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
        res.status(200).json({ success: true, data: plans });
    }
    catch (error) {
        console.error('Get plans error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const getInvestments = async (req, res) => {
    try {
        const investments = await prisma.investment.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            include: { deposits: true, withdrawals: true },
        });
        res.status(200).json({ success: true, data: investments });
    }
    catch (error) {
        console.error('Get investments error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const getInvestment = async (req, res) => {
    try {
        const { id } = req.params;
        const investment = await prisma.investment.findFirst({
            where: { id, userId: req.user.id },
            include: { deposits: true, withdrawals: true },
        });
        if (!investment) {
            res.status(404).json({ success: false, message: 'Investment not found' });
            return;
        }
        res.status(200).json({ success: true, data: investment });
    }
    catch (error) {
        console.error('Get investment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const createInvestment = async (req, res) => {
    try {
        const validated = createInvestmentSchema.parse(req.body);
        const { amount, paymentMethod } = validated;
        const investmentId = generateInvestmentId();
        const investment = await prisma.investment.create({
            data: {
                investmentId,
                userId: req.user.id,
                planId: validated.planId,
                depositAmount: amount,
                currentBalance: amount,
                profitPercentage: 0,
                profitAmount: 0,
                status: 'PENDING',
            },
            include: { user: true },
        });
        const deposit = await prisma.deposit.create({
            data: {
                userId: req.user.id,
                investmentId: investment.id,
                amount,
                paymentMethod,
                status: 'WAITING_FOR_PAYMENT_DETAILS',
            },
        });
        await notifyNewInvestment(investment.investmentId, `${investment.user.firstName} ${investment.user.lastName}`, Number(amount), investment.userId, investment.id);
        await prisma.auditLog.create({
            data: {
                adminId: req.user.id,
                action: 'Investment Created',
                entityType: 'Investment',
                entityId: investment.id,
                details: JSON.stringify({ amount, paymentMethod }),
            },
        });
        res.status(201).json({
            success: true,
            message: 'Investment request created successfully',
            data: { investment, depositId: deposit.id },
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
            return;
        }
        console.error('Create investment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const updateInvestmentProfit = async (req, res) => {
    try {
        const { id } = req.params;
        const { profitAmount, currentBalance, profitPercentage } = req.body;
        const existing = await prisma.investment.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Investment not found' });
            return;
        }
        const newBalance = currentBalance ?? Number(existing.depositAmount) + (profitAmount ?? 0);
        const newProfitAmount = profitAmount ?? Number(existing.currentBalance) - Number(existing.depositAmount);
        const calculatedProfitPercentage = profitPercentage ?? (newProfitAmount / Number(existing.depositAmount) * 100);
        const investment = await prisma.investment.update({
            where: { id },
            data: {
                currentBalance: newBalance,
                profitPercentage: Number(calculatedProfitPercentage),
                profitAmount: newProfitAmount,
            },
            include: { user: true },
        });
        global.sseClients?.forEach((client) => {
            if (client.userId === investment.userId) {
                client.send(JSON.stringify({
                    type: 'profit_updated',
                    profitAmount: newProfitAmount,
                    investmentId: investment.investmentId,
                }));
            }
        });
        res.status(200).json({ success: true, message: 'Profit updated', data: investment });
    }
    catch (error) {
        console.error('Update profit error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const startTrade = async (req, res) => {
    try {
        const { id } = req.params;
        const investment = await prisma.investment.update({
            where: { id },
            data: {
                status: 'ACTIVE_TRADE',
                tradeStartDate: new Date(),
            },
            include: { user: true },
        });
        global.sseClients?.forEach((client) => {
            if (client.userId === investment.userId) {
                client.send(JSON.stringify({
                    type: 'trade_started',
                    status: 'ACTIVE_TRADE',
                    investmentId: investment.investmentId,
                }));
            }
        });
        res.status(200).json({ success: true, message: 'Trade started', data: investment });
    }
    catch (error) {
        console.error('Start trade error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const closeTrade = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const investment = await prisma.investment.update({
            where: { id },
            data: {
                status: 'CLOSED',
                tradeEndDate: new Date(),
                notes,
            },
            include: { user: true },
        });
        await notifyTradeClosed(investment.investmentId, investment.user.firstName);
        res.status(200).json({ success: true, message: 'Trade closed', data: investment });
    }
    catch (error) {
        console.error('Close trade error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const rejectInvestment = async (req, res) => {
    try {
        const { id } = req.params;
        const investment = await prisma.investment.update({
            where: { id },
            data: {
                status: 'REJECTED',
            },
        });
        res.status(200).json({ success: true, message: 'Investment rejected', data: investment });
    }
    catch (error) {
        console.error('Reject investment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
