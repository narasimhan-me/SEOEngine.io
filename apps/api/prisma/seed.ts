import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Check if admin user exists
  let admin = await prisma.user.findFirst({
    where: {
      email: 'admin@engineo.ai',
    },
  });

  // Create admin user if it doesn't exist
  if (!admin) {
    console.log('👤 Creating admin user...');
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    admin = await prisma.user.create({
      data: {
        email: 'admin@engineo.ai',
        password: hashedPassword,
        name: 'Admin User',
        role: 'ADMIN',
        // [ADMIN-OPS-1] Set internal admin role and account status
        adminRole: 'OPS_ADMIN',
        accountStatus: 'ACTIVE',
      },
    });
    console.log('✅ Admin user created:', admin.id);
  } else {
    // Ensure admin role and internal admin role
    const needsUpdate = admin.role !== 'ADMIN' || !(admin as any).adminRole || (admin as any).accountStatus !== 'ACTIVE';
    if (needsUpdate) {
      admin = await prisma.user.update({
        where: { id: admin.id },
        data: {
          role: 'ADMIN',
          // [ADMIN-OPS-1] Ensure adminRole and accountStatus are set
          adminRole: 'OPS_ADMIN',
          accountStatus: 'ACTIVE',
        },
      });
      console.log('✅ Updated user to ADMIN role with OPS_ADMIN internal role');
    } else {
      console.log('✅ Admin user already exists with proper roles:', admin.id);
    }
  }

  // Check if a user already exists
  let user = await prisma.user.findFirst({
    where: {
      email: 'demo@seoengine.io',
    },
  });

  // Create a demo user if it doesn't exist
  if (!user) {
    console.log('👤 Creating demo user...');
    user = await prisma.user.create({
      data: {
        email: 'demo@seoengine.io',
        password: 'demo-password-hash', // In production, this should be hashed
        name: 'Demo User',
      },
    });
    console.log('✅ Demo user created:', user.id);
  } else {
    console.log('✅ Demo user already exists:', user.id);
  }

  // Check if a project already exists for this user
  let project = await prisma.project.findFirst({
    where: {
      userId: user.id,
    },
  });

  // Create a demo project if it doesn't exist
  if (!project) {
    console.log('📁 Creating demo project...');
    project = await prisma.project.create({
      data: {
        userId: user.id,
        name: 'Demo Project',
        domain: 'example.com',
      },
    });
    console.log('✅ Demo project created:', project.id);
  } else {
    console.log('✅ Demo project already exists:', project.id);
  }

  console.log('🎉 Seed completed successfully!');
  console.log(`📋 Project ID: ${project.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

