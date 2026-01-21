#!/usr/bin/env node

/**
 * Helper script to create a test product in the database
 * This is needed for testing answer blocks endpoints
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestProduct() {
  try {
    // First, create or get a test user
    let user = await prisma.user.findFirst({
      where: { email: { startsWith: 'test-product@' } },
    });

    if (!user) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('testpassword123', 10);
      user = await prisma.user.create({
        data: {
          email: `test-product-${Date.now()}@example.com`,
          password: hashedPassword,
          name: 'Test Product User',
        },
      });
    }

    // Create or get a project for this user
    let project = await prisma.project.findFirst({
      where: { userId: user.id, name: 'Test Project' },
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          userId: user.id,
          name: 'Test Project',
          domain: 'test.example.com',
        },
      });
    }

    // Create a test product
    const product = await prisma.product.create({
      data: {
        projectId: project.id,
        externalId: `test-product-${Date.now()}`,
        title: 'Test Product',
        description: 'This is a test product for answer blocks testing',
      },
    });

    console.log('✅ Test product created:');
    console.log(`   Product ID: ${product.id}`);
    console.log(`   Project ID: ${project.id}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   User Email: ${user.email}`);
    console.log('');
    console.log(
      'You can now use this product ID to test answer blocks endpoints.'
    );

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error creating test product:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createTestProduct();
