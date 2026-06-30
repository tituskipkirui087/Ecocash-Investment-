import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xgotkgxnsupvdzsorlij.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  const { method, url } = req;
  const path = url.split('?')[0];

  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (method === 'OPTIONS') return res.status(200).end();

  if (path === '/api/health') {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  let body = {};
  if (req.body) {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }

  try {
    if (path === '/api/investments/plans') {
      const { data: plans, error } = await supabase.from('investment_plans').select('*');
      if (error) throw error;
      return res.json({ success: true, data: plans });
    }

    if (path === '/api/deposits' && method === 'GET') {
      const { data: deposits, error } = await supabase.from('deposits').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({ success: true, data: deposits });
    }

    if (path === '/api/auth/register' && method === 'POST') {
      const schema = z.object({ email: z.string().email(), password: z.string().min(6), firstName: z.string().min(1), lastName: z.string().min(1) });
      const parsed = schema.parse(body);
      const { data: existing, error: checkError } = await supabase.from('users').select('id').eq('email', parsed.email).single();
      if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });
      
      const { data: user, error: createError } = await supabase
        .from('users')
        .insert({ 
          email: parsed.email, 
          password: await bcrypt.hash(parsed.password, 10), 
          first_name: parsed.firstName,
          last_name: parsed.lastName,
          is_verified: false,
          is_active: false,
          role: 'INVESTOR'
        })
        .select('id, email, first_name, last_name, is_verified, role, created_at')
        .single();
      
      if (createError) throw createError;
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({ success: true, message: 'Registration successful!', data: { user, token } });
    }

    if (path === '/api/auth/login' && method === 'POST') {
      const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
      const parsed = schema.parse(body);
      const { data: user, error } = await supabase.from('users').select('*').eq('email', parsed.email).single();
      if (error || !user || !(await bcrypt.compare(parsed.password, user.password))) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      if (!user.is_active) return res.status(403).json({ success: false, message: 'Account pending approval' });
      const { password, ...u } = user;
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({ success: true, message: 'Login successful', data: { user: u, token } });
    }

    if (path === '/api/deposits/submit' && method === 'POST') {
      const { data: deposit, error } = await supabase
        .from('deposits')
        .insert({ amount: parseFloat(body.amount), status: 'PAYMENT_SUBMITTED' })
        .select()
        .single();
      if (error) throw error;
      return res.json({ success: true, data: deposit });
    }

    return res.status(404).json({ success: false, message: 'Route not found' });
  } catch (err) {
    const e = err;
    if (e instanceof z.ZodError) return res.status(400).json({ success: false, message: 'Validation error', errors: e.errors });
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
}