import { Router } from 'express';
import { getTelegramBot } from '../services/telegramService.js';
const router = Router();
router.post('/webhook', (req, res) => {
    try {
        const bot = getTelegramBot();
        const body = req.body;
        if (bot && body.message && body.message.text) {
            const chatId = body.message.chat.id;
            const text = body.message.text;
            if (text === '/start') {
                bot.sendMessage(chatId, 'Welcome to Ecocash Investment Bot\n\nCommands:\n/pending - View pending actions\n/users - List all users\n/investments - List investments\n/withdrawals - List withdrawals');
            }
            else if (text === '/pending') {
                bot.sendMessage(chatId, 'Pending actions feature coming soon.');
            }
            else if (text === '/users') {
                bot.sendMessage(chatId, 'Users list feature coming soon.');
            }
            else if (text === '/investments') {
                bot.sendMessage(chatId, 'Investments list feature coming soon.');
            }
            else if (text === '/withdrawals') {
                bot.sendMessage(chatId, 'Withdrawals list feature coming soon.');
            }
        }
        if (bot && body.callback_query) {
            const callbackQuery = body.callback_query;
            const callbackData = callbackQuery.data;
            const chatId = callbackQuery.message.chat.id;
            if (callbackData.startsWith('send_ecocash_')) {
                const invId = callbackData.replace('send_ecocash_', '');
                bot.sendMessage(chatId, `📱 Send EcoCash details. Format:\necocash:0771234567,John Doe,REF123,${invId}`);
            }
            else if (callbackData.startsWith('reject_investment_')) {
                bot.sendMessage(chatId, 'Investment rejected.');
            }
            else if (callbackData.startsWith('approve_deposit_')) {
                bot.sendMessage(chatId, 'Deposit approved.');
            }
            else if (callbackData.startsWith('reject_deposit_')) {
                bot.sendMessage(chatId, 'Deposit rejected.');
            }
            else if (callbackData.startsWith('paid_withdrawal_')) {
                bot.sendMessage(chatId, 'Withdrawal marked as paid.');
            }
            else if (callbackData.startsWith('reject_withdrawal_')) {
                bot.sendMessage(chatId, 'Withdrawal rejected.');
            }
        }
        res.sendStatus(200);
    }
    catch (error) {
        console.error('Telegram webhook error:', error);
        res.sendStatus(200);
    }
});
export default router;
