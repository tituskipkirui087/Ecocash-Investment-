import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/db.js';
export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ success: false, message: 'Access token required' });
        return;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, role: true, isActive: true, firstName: true, lastName: true },
        });
        if (!user || !user.isActive) {
            res.status(401).json({ success: false, message: 'Invalid or inactive user' });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
};
export const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ success: false, message: 'Admin access required' });
        return;
    }
    next();
};
export const validateBody = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors,
                });
                return;
            }
            next();
        }
    };
};
export const requireParam = (param) => {
    return (req, res, next) => {
        if (!req.params[param]) {
            res.status(400).json({ success: false, message: `${param} is required` });
            return;
        }
        next();
    };
};
export const getClientIp = (req) => {
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
};
