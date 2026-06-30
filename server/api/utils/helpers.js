export const generateVerificationToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};
export const generateResetToken = () => {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};
export const generateInvestmentId = () => {
    return 'INV-' + Math.random().toString(36).substring(2, 10).toUpperCase();
};
export const generateDepositId = () => {
    return 'DEP-' + Math.random().toString(36).substring(2, 10).toUpperCase();
};
export const generateWithdrawalId = () => {
    return 'WTH-' + Math.random().toString(36).substring(2, 10).toUpperCase();
};
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(Number(amount));
};
export const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};
