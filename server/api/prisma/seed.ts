import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10)
  const investorPassword = await bcrypt.hash('investor123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecocashinvestment.com' },
    update: {},
    create: {
      email: 'admin@ecocashinvestment.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isVerified: true,
      isActive: true,
    },
  })

  const investor = await prisma.user.upsert({
    where: { email: 'investor@example.com' },
    update: {},
    create: {
      email: 'investor@example.com',
      password: investorPassword,
      firstName: 'John',
      lastName: 'Doe',
      phone: '0712345678',
      role: 'INVESTOR',
      isVerified: true,
      isActive: true,
    },
  })

  await prisma.investmentPlan.createMany({
    data: [
      {
        name: 'Starter',
        slug: 'starter',
        description: 'Perfect for first-time investors. Start your journey with EcoCash Zimbabwe trading.',
        minAmount: 100,
        maxAmount: 199,
        returnMultiplier: 13,
        tradeDurationHours: 6,
        isActive: true,
        sortOrder: 1,
      },
      {
        name: 'Growth',
        slug: 'growth',
        description: 'Accelerate your earnings with our optimized mining algorithm.',
        minAmount: 200,
        maxAmount: 299,
        returnMultiplier: 13,
        tradeDurationHours: 6,
        isActive: true,
        sortOrder: 2,
      },
      {
        name: 'Professional',
        slug: 'professional',
        description: 'For serious investors ready to maximize returns with our advanced trading engine.',
        minAmount: 300,
        maxAmount: 399,
        returnMultiplier: 13,
        tradeDurationHours: 6,
        isActive: true,
        sortOrder: 3,
      },
      {
        name: 'Premium',
        slug: 'premium',
        description: 'High-volume trading with priority signal processing and stable market execution.',
        minAmount: 400,
        maxAmount: 499,
        returnMultiplier: 13,
        tradeDurationHours: 6,
        isActive: true,
        sortOrder: 4,
      },
      {
        name: 'Enterprise',
        slug: 'enterprise',
        description: 'Our flagship package for maximum profit. Dedicated mining power and zero slippage protection.',
        minAmount: 500,
        maxAmount: null,
        returnMultiplier: 13,
        tradeDurationHours: 6,
        isActive: true,
        sortOrder: 5,
      },
    ],
  })

  console.log('Admin:', admin.email)
  console.log('Investor:', investor.email)
  console.log('Plans seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
