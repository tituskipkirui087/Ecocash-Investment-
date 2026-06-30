import { Router } from 'express';
import { getDashboardStats, getAllUsers, getAllInvestments, getAllDeposits, getAllWithdrawals, getAuditLogs, updateUserStatus, createAdmin } from '../controllers/adminController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { approveWithdrawal, rejectWithdrawal } from '../controllers/withdrawalController.js';
const router = Router();
const botSecret = process.env.BOT_SECRET || 'ecocash_bot_secret_2024';
const botAuthMiddleware = (req, res, next) => {
    const secret = req.headers['x-bot-secret'];
    if (secret === botSecret) {
        next();
    }
    else {
        res.status(401).json({ success: false, message: 'Unauthorized bot access' });
    }
};
// Bot-accessible endpoints (must come before authenticateToken middleware)
router.post('/withdrawals/:id/approve', botAuthMiddleware, approveWithdrawal);
router.post('/withdrawals/:id/reject', botAuthMiddleware, rejectWithdrawal);
router.use(authenticateToken, requireAdmin);
router.get('/dashboard', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/investments', getAllInvestments);
router.get('/deposits', getAllDeposits);
router.get('/withdrawals', getAllWithdrawals);
router.get('/audit-logs', getAuditLogs);
router.put('/users/:id/status', updateUserStatus);
router.post('/admins', createAdmin);
export default router;
