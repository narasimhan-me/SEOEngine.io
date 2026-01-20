#!/usr/bin/env node

/**
 * Test script for Answer Blocks endpoints
 * Tests all requirements:
 * 1. GET /products/:id/answer-blocks
 * 2. POST /products/:id/answer-blocks
 * 3. Upsert behavior
 * 4. Ownership check
 */

const http = require('http');

const API_URL = 'http://localhost:3001';
let authToken = '';
let userId = '';
let projectId = '';
let productId = '';

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testStep(name, fn) {
  process.stdout.write(`\n${name}... `);
  try {
    await fn();
    console.log('✅');
  } catch (error) {
    console.log(`❌\n   Error: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('🧪 Testing Answer Blocks Endpoints');
  console.log('==================================\n');

  // Step 1: Sign up
  await testStep('1. Signing up user', async () => {
    const email = `test-answer-blocks-${Date.now()}@example.com`;
    const response = await makeRequest('POST', '/auth/signup', {
      email,
      password: 'testpassword123',
      name: 'Test User',
      captchaToken: 'test-token',
    });

    if (response.status !== 201) {
      throw new Error(
        `Signup failed: ${response.status} - ${JSON.stringify(response.body)}`
      );
    }
    userId = response.body.id;
  });

  // Step 2: Login
  await testStep('2. Logging in', async () => {
    const email = `test-answer-blocks-${Date.now() - 1000}@example.com`;
    // Try login with the user we just created (approximate email)
    // Actually, we need to track the email from signup
    // For simplicity, let's signup again with a known email
    const testEmail = `test-${Date.now()}@example.com`;

    await makeRequest('POST', '/auth/signup', {
      email: testEmail,
      password: 'testpassword123',
      name: 'Test User',
      captchaToken: 'test-token',
    });

    const response = await makeRequest('POST', '/auth/login', {
      email: testEmail,
      password: 'testpassword123',
      captchaToken: 'test-token',
    });

    if (response.status !== 200 || !response.body.accessToken) {
      throw new Error(
        `Login failed: ${response.status} - ${JSON.stringify(response.body)}`
      );
    }
    authToken = response.body.accessToken;
    userId = response.body.user.id;
  });

  // Step 3: Create project
  await testStep('3. Creating project', async () => {
    const response = await makeRequest(
      'POST',
      '/projects',
      {
        name: 'Test Project',
        domain: 'test.example.com',
      },
      authToken
    );

    if (response.status !== 201 || !response.body.id) {
      throw new Error(
        `Project creation failed: ${response.status} - ${JSON.stringify(response.body)}`
      );
    }
    projectId = response.body.id;
  });

  // Step 4: Create product (we'll need to use Prisma or check for existing products)
  // For now, let's check if there are existing products
  await testStep('4. Checking for products', async () => {
    const response = await makeRequest(
      'GET',
      `/projects/${projectId}/products`,
      null,
      authToken
    );

    if (response.status !== 200) {
      throw new Error(`Failed to get products: ${response.status}`);
    }

    const products = Array.isArray(response.body) ? response.body : [];

    if (products.length > 0) {
      productId = products[0].id;
      console.log(`   Using existing product: ${productId}`);
    } else {
      // We need to create a product - this would typically be done via Shopify sync
      // For testing, we can insert directly into the database or skip
      throw new Error(
        'No products found. Please create a product first (e.g., via Shopify sync) or insert directly into database.'
      );
    }
  });

  // Step 5: Test GET endpoint
  await testStep('5. Testing GET /products/:id/answer-blocks', async () => {
    const response = await makeRequest(
      'GET',
      `/products/${productId}/answer-blocks`,
      null,
      authToken
    );

    if (response.status !== 200) {
      throw new Error(
        `GET failed: ${response.status} - ${JSON.stringify(response.body)}`
      );
    }

    if (!Array.isArray(response.body)) {
      throw new Error(`Expected array, got: ${typeof response.body}`);
    }

    if (response.body.length === 0) {
      console.log('   ✓ Returned empty array (no blocks yet)');
    } else {
      console.log(`   ✓ Returned ${response.body.length} answer block(s)`);
    }
  });

  // Step 6: Test POST endpoint
  await testStep('6. Testing POST /products/:id/answer-blocks', async () => {
    const response = await makeRequest(
      'POST',
      `/products/${productId}/answer-blocks`,
      {
        blocks: [
          {
            questionId: 'what_is_it',
            question: 'What is this product?',
            answer: 'A test answer.',
            confidence: 0.85,
          },
        ],
      },
      authToken
    );

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(
        `POST failed: ${response.status} - ${JSON.stringify(response.body)}`
      );
    }

    if (!Array.isArray(response.body) || response.body.length === 0) {
      throw new Error(
        `Expected array with at least one block, got: ${JSON.stringify(response.body)}`
      );
    }

    const block = response.body[0];
    if (!block.id || !block.questionText || !block.answerText) {
      throw new Error(`Invalid block structure: ${JSON.stringify(block)}`);
    }

    console.log(`   ✓ Created answer block with ID: ${block.id}`);
  });

  // Step 7: Test upsert behavior
  await testStep(
    '7. Testing upsert behavior (update existing block)',
    async () => {
      const response = await makeRequest(
        'POST',
        `/products/${productId}/answer-blocks`,
        {
          blocks: [
            {
              questionId: 'what_is_it',
              question: 'What is this product?',
              answer: 'An updated test answer.',
              confidence: 0.9,
            },
          ],
        },
        authToken
      );

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(
          `Upsert failed: ${response.status} - ${JSON.stringify(response.body)}`
        );
      }

      const block = response.body[0];
      if (block.answerText !== 'An updated test answer.') {
        throw new Error(
          `Upsert didn't update: expected "An updated test answer.", got "${block.answerText}"`
        );
      }

      // Verify we still have only one block (not duplicated)
      const getResponse = await makeRequest(
        'GET',
        `/products/${productId}/answer-blocks`,
        null,
        authToken
      );

      const blocks = getResponse.body;
      const whatIsItBlocks = blocks.filter(
        (b) => b.questionId === 'what_is_it'
      );
      if (whatIsItBlocks.length !== 1) {
        throw new Error(
          `Expected 1 block for questionId "what_is_it", got ${whatIsItBlocks.length}`
        );
      }

      console.log('   ✓ Existing block was updated (not duplicated)');
    }
  );

  // Step 8: Test ownership check
  await testStep(
    '8. Testing ownership check (403/404 for other user)',
    async () => {
      // Create another user
      const otherEmail = `other-user-${Date.now()}@example.com`;
      await makeRequest('POST', '/auth/signup', {
        email: otherEmail,
        password: 'testpassword123',
        name: 'Other User',
        captchaToken: 'test-token',
      });

      const loginResponse = await makeRequest('POST', '/auth/login', {
        email: otherEmail,
        password: 'testpassword123',
        captchaToken: 'test-token',
      });

      const otherToken = loginResponse.body.accessToken;

      const response = await makeRequest(
        'GET',
        `/products/${productId}/answer-blocks`,
        null,
        otherToken
      );

      if (response.status !== 403 && response.status !== 404) {
        throw new Error(
          `Expected 403 or 404 for ownership check, got ${response.status} - ${JSON.stringify(response.body)}`
        );
      }

      console.log(`   ✓ Ownership check works - returned ${response.status}`);
    }
  );

  console.log('\n==================================');
  console.log('✅ All tests passed!');
  console.log('');
}

main().catch((error) => {
  console.error('\n❌ Test suite failed:', error.message);
  process.exit(1);
});
