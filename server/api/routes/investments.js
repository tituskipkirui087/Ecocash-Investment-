import { Router } from 'express';
import { getInvestments, getInvestment, createInvestment, updateInvestmentProfit, startTrade, closeTrade, getPlans, rejectInvestment } from '../controllers/investmentController.js';
import { authenticateToken } from '../middleware/auth.js';
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
router.post('/admin/start-trade/:id', botAuthMiddleware, startTrade);
router.post('/admin/close-trade/:id', botAuthMiddleware, closeTrade);
router.post('/:id/reject', botAuthMiddleware, rejectInvestment);
router.get('/plans', getPlans);
router.use(authenticateToken);
router.get('/', getInvestments);
router.get('/:id', getInvestment);
router.post('/', createInvestment);
router.put('/:id/profit', updateInvestmentProfit);
router.put('/:id/update-profit', updateInvestmentProfit); // Bot endpoint
router.put('/:id/start-trade', startTrade);
router.put('/:id/close-trade', closeTrade);
export default router;
