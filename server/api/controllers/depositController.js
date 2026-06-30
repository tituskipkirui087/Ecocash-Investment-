import { prisma } from '../config/db.js';
import { notifyDepositSubmitted } from '../services/telegramService.js';
import { getClientIp } from '../middleware/auth.js';
import { z } from 'zod';
import path from 'path';
const submitDepositSchema = z.object({
    depositId: z.string(),
    transactionHash: z.string().optional(),
});
const updateDepositStatusSchema = z.object({
    status: z.enum(['PAYMENT_DETAILS_SENT', 'PAYMENT_RECEIVED', 'REJECTED']),
    ecocashNumber: z.string().optional(),
    ecocashAccountName: z.string().optional(),
    ecocashReference: z.string().optional(),
    adminNotes: z.string().optional(),
});
const UPLOAD_DIR = path.join(process.cwd(), '..', 'public', 'uploads');
export const getDeposits = async (req, res) => {
    try {
        const deposits = await prisma.deposit.findMany({
            where: { userId: req.user.id },
            include: { investment: true },
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({ success: true, data: deposits });
    }
    catch (error) {
        console.error('Get deposits error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const submitDeposit = async (req, res) => {
    try {
        const validated = submitDepositSchema.parse(req.body);
        const { depositId, transactionHash } = validated;
        const deposit = await prisma.deposit.findFirst({
            where: { id: depositId, userId: req.user.id },
        });
        if (!deposit) {
            res.status(404).json({ success: false, message: 'Deposit not found' });
            return;
        }
        if (deposit.status !== 'WAITING_FOR_PAYMENT_DETAILS' && deposit.status !== 'PAYMENT_DETAILS_SENT') {
            res.status(400).json({ success: false, message: 'Deposit cannot be updated' });
            return;
        }
        const updated = await prisma.deposit.update({
            where: { id: depositId },
            data: {
                transactionHash,
                status: 'PAYMENT_SUBMITTED',
                ipAddress: getClientIp(req),
            },
        });
        res.status(200).json({ success: true, message: 'Deposit submitted for verification', data: updated });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
            return;
        }
        console.error('Submit deposit error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
const uploadDepositSchema = z.object({
    depositId: z.string(),
    receipt: z.any().optional(),
});
export const uploadReceipt = async (req, res) => {
    try {
        const { depositId } = uploadDepositSchema.parse(req.body);
        const file = req.file;
        if (!file) {
            res.status(400).json({ success: false, message: 'Receipt screenshot is required' });
            return;
        }
        const receiptScreenshot = `/uploads/${file.filename}`;
        const deposit = await prisma.deposit.update({
            where: { id: depositId },
            data: { receiptScreenshot, status: 'PAYMENT_SUBMITTED' },
            include: { user: true, investment: true },
        });
        if (deposit.user && deposit.investment) {
            await notifyDepositSubmitted(deposit.id, `${deposit.user.firstName} ${deposit.user.lastName}`, Number(deposit.amount), 'ECOCASH', receiptScreenshot);
        }
        res.status(200).json({ success: true, message: 'Receipt uploaded', data: deposit });
    }
    catch (error) {
        console.error('Upload receipt error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const updateDepositStatus = async (req, res) => {
    try {
        const investmentId = req.params.id;
        const validated = updateDepositStatusSchema.parse(req.body);
        // Find the deposit belonging to the investment
        const deposit = await prisma.deposit.findFirst({
            where: { investmentId },
            include: { investment: true },
        });
        if (!deposit) {
            res.status(404).json({ success: false, message: 'Deposit not found for this investment' });
            return;
        }
        console.log('Updating deposit status for investment:', investmentId, 'userId:', deposit.userId);
        const updatedDeposit = await prisma.deposit.update({
            where: { id: deposit.id },
            data: {
                status: validated.status,
                ecocashNumber: validated.ecocashNumber,
                ecocashAccountName: validated.ecocashAccountName,
                ecocashReference: validated.ecocashReference,
                adminNotes: validated.adminNotes,
            },
        });
        console.log('Deposit updated, checking SSE clients:', global.sseClients?.length);
        global.sseClients?.forEach((client) => {
            console.log('Checking SSE client for userId:', client.userId, 'target userId:', updatedDeposit.userId);
            if (client.userId === updatedDeposit.userId) {
                console.log('Sending payment details to user via SSE');
                client.send(JSON.stringify({
                    type: 'payment_details',
                    ecocashNumber: validated.ecocashNumber,
                    ecocashAccountName: validated.ecocashAccountName,
                    ecocashReference: validated.ecocashReference,
                }));
            }
        });
        res.status(200).json({ success: true, message: 'Deposit status updated', data: updatedDeposit });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
            return;
        }
        console.error('Update deposit error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const approveDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminNotes } = req.body;
        const deposit = await prisma.deposit.findUnique({
            where: { id },
            include: { investment: true },
        });
        if (!deposit) {
            res.status(404).json({ success: false, message: 'Deposit not found' });
            return;
        }
        const updatedDeposit = await prisma.deposit.update({
            where: { id },
            data: { status: 'PAYMENT_RECEIVED', adminNotes },
        });
        if (deposit.investmentId) {
            await prisma.investment.update({
                where: { id: deposit.investmentId },
                data: { status: 'PAYMENT_RECEIVED' },
            });
        }
        // Notify user via SSE
        ;
        global.sseClients?.forEach((client) => {
            if (client.userId === updatedDeposit.userId) {
                client.send(JSON.stringify({
                    type: 'payment_approved',
                    status: 'PAYMENT_RECEIVED',
                }));
            }
        });
        res.status(200).json({
            success: true,
            message: 'Deposit approved',
            data: {
                ...updatedDeposit,
                investment: deposit.investment
            }
        });
    }
    catch (error) {
        console.error('Approve deposit error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const rejectDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminNotes } = req.body;
        const deposit = await prisma.deposit.update({
            where: { id },
            data: { status: 'REJECTED', adminNotes },
        });
        res.status(200).json({ success: true, message: 'Deposit rejected', data: deposit });
    }
    catch (error) {
        console.error('Reject deposit error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
