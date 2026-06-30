import { prisma } from '../config/db.js';
import { notifyWithdrawalRequest } from '../services/telegramService.js';
import { generateWithdrawalId } from '../utils/helpers.js';
import { z } from 'zod';
const WITHDRAWAL_FEE_PERCENT = 0.02;
const WITHDRAWAL_FEE_MIN = 1;
const WITHDRAWAL_FEE_MAX = 5;
const getWithdrawalFee = (amount) => {
    const fee = amount * WITHDRAWAL_FEE_PERCENT;
    return Math.max(WITHDRAWAL_FEE_MIN, Math.min(WITHDRAWAL_FEE_MAX, fee));
};
const createWithdrawalSchema = z.object({
    investmentId: z.string(),
    amount: z.number().min(1),
    method: z.enum(['ECOCASH']),
    ecocashNumber: z.string().min(1, 'EcoCash number required'),
    walletAddress: z.string().optional(),
});
export const getWithdrawals = async (req, res) => {
    try {
        const withdrawals = await prisma.withdrawal.findMany({
            where: { userId: req.user.id },
            include: { investment: true },
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({ success: true, data: withdrawals });
    }
    catch (error) {
        console.error('Get withdrawals error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const createWithdrawal = async (req, res) => {
    try {
        const validated = createWithdrawalSchema.parse(req.body);
        const { investmentId, amount, method, ecocashNumber, walletAddress } = validated;
        const investment = await prisma.investment.findFirst({
            where: { id: investmentId, userId: req.user.id },
        });
        if (!investment) {
            res.status(404).json({ success: false, message: 'Investment not found' });
            return;
        }
        const fee = getWithdrawalFee(amount);
        const totalDeduct = Number(amount) + fee;
        if (Number(investment.currentBalance) < totalDeduct) {
            res.status(400).json({ success: false, message: `Insufficient balance. Fee: $${fee.toFixed(2)}` });
            return;
        }
        const withdrawalId = generateWithdrawalId();
        const withdrawal = await prisma.withdrawal.create({
            data: {
                userId: req.user.id,
                investmentId,
                amount,
                method,
                ecocashNumber,
                walletAddress,
                status: 'WITHDRAWAL_PENDING',
                transactionHash: `Fee: ${fee.toFixed(2)}`,
            },
            include: { investment: true },
        });
        await notifyWithdrawalRequest(withdrawalId, `${req.user.firstName} ${req.user.lastName}`, Number(amount), method);
        res.status(201).json({
            success: true,
            message: 'Withdrawal request submitted',
            data: withdrawal,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
            return;
        }
        console.error('Create withdrawal error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const approveWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { transactionHash, adminNotes } = req.body;
        const withdrawal = await prisma.withdrawal.findUnique({
            where: { id },
            include: { investment: true },
        });
        if (!withdrawal) {
            res.status(404).json({ success: false, message: 'Withdrawal not found' });
            return;
        }
        // Extract fee from transactionHash if it was stored as "Fee: XX.XX"
        const feeMatch = withdrawal.transactionHash?.match(/Fee: ([\d.]+)/);
        const fee = feeMatch ? Number(feeMatch[1]) : getWithdrawalFee(Number(withdrawal.amount));
        const totalDeduct = Number(withdrawal.amount) + fee;
        const updated = await prisma.withdrawal.update({
            where: { id },
            data: {
                status: 'WITHDRAWN',
                transactionHash,
                adminNotes,
            },
        });
        await prisma.investment.update({
            where: { id: withdrawal.investmentId },
            data: {
                currentBalance: {
                    decrement: totalDeduct
                },
            },
        });
        res.status(200).json({ success: true, message: 'Withdrawal approved', data: updated });
    }
    catch (error) {
        console.error('Approve withdrawal error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const rejectWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminNotes } = req.body;
        const updated = await prisma.withdrawal.update({
            where: { id },
            data: { status: 'REJECTED', adminNotes },
        });
        res.status(200).json({ success: true, message: 'Withdrawal rejected', data: updated });
    }
    catch (error) {
        console.error('Reject withdrawal error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
