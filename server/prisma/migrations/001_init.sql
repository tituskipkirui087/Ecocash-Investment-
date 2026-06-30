-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant all privileges on tables to postgres user
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone VARCHAR(255),
    avatar TEXT,
    is_verified BOOLEAN DEFAULT false,
    verification_token TEXT,
    reset_token TEXT,
    reset_token_expiry TIMESTAMP,
    role VARCHAR(50) DEFAULT 'INVESTOR',
    is_active BOOLEAN DEFAULT true,
    full_name_legal TEXT,
    date_of_birth DATE,
    residential_address TEXT,
    country VARCHAR(255) DEFAULT 'Zimbabwe',
    id_document_type VARCHAR(50),
    id_document_number TEXT,
    id_document_url TEXT,
    id_document_front_url TEXT,
    id_document_back_url TEXT,
    selfie_url TEXT,
    kyc_status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Investment plans table
CREATE TABLE IF NOT EXISTS investment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    min_amount DECIMAL(10,2) NOT NULL,
    max_amount DECIMAL(10,2),
    return_multiplier DECIMAL(5,2) NOT NULL,
    trade_duration_hours INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Investments table
CREATE TABLE IF NOT EXISTS investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES investment_plans(id) ON DELETE SET NULL,
    deposit_amount DECIMAL(10,2) NOT NULL,
    current_balance DECIMAL(10,2) NOT NULL,
    profit_percentage DECIMAL(5,2) DEFAULT 0,
    profit_amount DECIMAL(10,2) DEFAULT 0,
    trade_start_date TIMESTAMP,
    trade_end_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Deposits table
CREATE TABLE IF NOT EXISTS deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    investment_id UUID REFERENCES investments(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'WAITING_FOR_PAYMENT_DETAILS',
    ecocash_number VARCHAR(255),
    ecocash_account_name VARCHAR(255),
    ecocash_reference VARCHAR(255),
    trc20_address TEXT,
    transaction_hash VARCHAR(255),
    receipt_screenshot VARCHAR(255),
    admin_notes TEXT,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    withdrawal_id VARCHAR(255),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    method VARCHAR(50) NOT NULL,
    ecocash_number VARCHAR(255),
    wallet_address TEXT,
    status VARCHAR(50) DEFAULT 'WITHDRAWAL_PENDING',
    transaction_hash VARCHAR(255),
    admin_notes TEXT,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    details TEXT,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);