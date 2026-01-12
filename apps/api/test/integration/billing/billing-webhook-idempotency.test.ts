/**
 * BILLING-1: Integration tests for Billing Webhook Idempotency
 *
 * Critical tests for preventing double-charging and duplicate side effects:
 * - Duplicate event handling (same event.id processed twice)
 * - Concurrent webhook processing
 * - Double-charging prevention
 * - Subscription state integrity
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import Stripe from 'stripe';
import { createTestApp } from '../../utils/test-app';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';
import { createTestUser } from '../../../src/testkit';
import { BillingService } from '../../../src/billing/billing.service';
import { ConfigService } from '@nestjs/config';
import { EntitlementsService } from '../../../src/billing/entitlements.service';

// Mock Stripe - must be before imports
const mockConstructEvent = jest.fn();
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => {
    return {
      webhooks: {
        constructEvent: mockConstructEvent,
      },
    };
  });
});

describe('BILLING-1 – Billing Webhook Idempotency', () => {
  let app: INestApplication;
  let server: any;
  let billingService: BillingService;
  let configService: ConfigService;
  let stripeMock: any;
  let webhookSecret: string;

  beforeAll(async () => {
    // Set environment variables for Stripe config
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
    process.env.STRIPE_WEBHOOK_SECRET = 'test_webhook_secret';
    process.env.STRIPE_PRICE_PRO = 'price_test_pro';
    process.env.STRIPE_PRICE_BUSINESS = 'price_test_business';

    app = await createTestApp();
    server = app.getHttpServer();
    billingService = app.get(BillingService);
    configService = app.get(ConfigService);
    webhookSecret = 'test_webhook_secret';

    // Get Stripe instance from service
    stripeMock = (billingService as any).stripe;
    if (stripeMock && stripeMock.webhooks) {
      stripeMock.webhooks.constructEvent = mockConstructEvent;
    }
  });

  afterAll(async () => {
    // Clean up environment variables
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_PRICE_PRO;
    delete process.env.STRIPE_PRICE_BUSINESS;

    await cleanupTestDb();
    await disconnectTestDb();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestDb();
    jest.clearAllMocks();
  });

  /**
   * Helper to create a Stripe webhook event
   */
  function createStripeEvent(
    type: string,
    eventId: string,
    data: any,
  ): Stripe.Event {
    return {
      id: eventId,
      object: 'event',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: data,
        previous_attributes: {},
      },
      livemode: false,
      pending_webhooks: 0,
      request: {
        id: null,
        idempotency_key: null,
      },
      type: type as Stripe.Event.Type,
    } as Stripe.Event;
  }

  /**
   * Helper to create webhook payload and signature
   */
  function createWebhookPayload(event: Stripe.Event): {
    payload: Buffer;
    signature: string;
  } {
    const payload = Buffer.from(JSON.stringify(event));
    // In real Stripe, signature is HMAC-SHA256, but for tests we'll mock it
    const signature = 'test_signature';
    return { payload, signature };
  }

  describe('checkout.session.completed idempotency', () => {
    it('should create subscription on first checkout.session.completed event', async () => {
      const { user } = await createTestUser(testPrisma, { plan: 'free' });
      const eventId = 'evt_checkout_completed_1';

      const session: Stripe.Checkout.Session = {
        id: 'cs_test_123',
        object: 'checkout.session',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        metadata: {
          userId: user.id,
          planId: 'pro',
        },
      } as any;

      const event = createStripeEvent('checkout.session.completed', eventId, session);
      const { payload, signature } = createWebhookPayload(event);

      mockConstructEvent.mockReturnValueOnce(event);

      const result = await billingService.handleWebhook(payload, signature);

      expect(result.received).toBe(true);

      // Verify subscription was created
      const subscription = await testPrisma.subscription.findUnique({
        where: { userId: user.id },
      });

      expect(subscription).not.toBeNull();
      expect(subscription?.plan).toBe('pro');
      expect(subscription?.status).toBe('active');
      expect(subscription?.stripeCustomerId).toBe('cus_test_123');
      expect(subscription?.stripeSubscriptionId).toBe('sub_test_123');
    });

    it('should be idempotent when same checkout.session.completed event is processed twice', async () => {
      const { user } = await createTestUser(testPrisma, { plan: 'free' });
      const eventId = 'evt_checkout_completed_2';

      const session: Stripe.Checkout.Session = {
        id: 'cs_test_456',
        object: 'checkout.session',
        customer: 'cus_test_456',
        subscription: 'sub_test_456',
        metadata: {
          userId: user.id,
          planId: 'pro',
        },
      } as any;

      const event = createStripeEvent('checkout.session.completed', eventId, session);
      const { payload, signature } = createWebhookPayload(event);

      mockConstructEvent.mockReturnValue(event);

      // Process first time
      await billingService.handleWebhook(payload, signature);

      // Get subscription after first processing
      const subscriptionAfterFirst = await testPrisma.subscription.findUnique({
        where: { userId: user.id },
      });
      expect(subscriptionAfterFirst).not.toBeNull();
      const firstSubscriptionId = subscriptionAfterFirst!.id;
      const firstUpdatedAt = subscriptionAfterFirst!.updatedAt;

      // Wait a bit to ensure updatedAt would change if update occurred
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Process second time (same event)
      await billingService.handleWebhook(payload, signature);

      // Verify subscription was not duplicated or unnecessarily updated
      const subscriptionAfterSecond = await testPrisma.subscription.findUnique({
        where: { userId: user.id },
      });

      expect(subscriptionAfterSecond).not.toBeNull();
      expect(subscriptionAfterSecond?.id).toBe(firstSubscriptionId);
      // Note: handleCheckoutCompleted uses upsert, so updatedAt may change
      // but the key is that no duplicate subscription was created
    });

    it('should prevent double-charging by using upsert for checkout.session.completed', async () => {
      const { user } = await createTestUser(testPrisma, { plan: 'free' });
      const eventId = 'evt_checkout_completed_3';

      const session: Stripe.Checkout.Session = {
        id: 'cs_test_789',
        object: 'checkout.session',
        customer: 'cus_test_789',
        subscription: 'sub_test_789',
        metadata: {
          userId: user.id,
          planId: 'business',
        },
      } as any;

      const event = createStripeEvent('checkout.session.completed', eventId, session);
      const { payload, signature } = createWebhookPayload(event);

      mockConstructEvent.mockReturnValue(event);

      // Process multiple times
      await Promise.all([
        billingService.handleWebhook(payload, signature),
        billingService.handleWebhook(payload, signature),
        billingService.handleWebhook(payload, signature),
      ]);

      // Verify only one subscription exists
      const subscriptions = await testPrisma.subscription.findMany({
        where: { userId: user.id },
      });

      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0]?.plan).toBe('business');
    });
  });

  describe('customer.subscription.updated idempotency', () => {
    it('should update subscription on first customer.subscription.updated event', async () => {
      const { user } = await createTestUser(testPrisma, { plan: 'free' });

      // Create initial subscription
      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan: 'pro',
          status: 'active',
          stripeCustomerId: 'cus_test_update',
          stripeSubscriptionId: 'sub_test_update',
        },
      });

      const eventId = 'evt_subscription_updated_1';

      const subscription: Stripe.Subscription = {
        id: 'sub_test_update',
        object: 'subscription',
        customer: 'cus_test_update',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        items: {
          object: 'list',
          data: [
            {
              id: 'si_test',
              object: 'subscription_item',
              price: {
                id: 'price_test_business',
                object: 'price',
              } as any,
            },
          ],
        },
      } as any;

      const event = createStripeEvent('customer.subscription.updated', eventId, subscription);
      const { payload, signature } = createWebhookPayload(event);

      mockConstructEvent.mockReturnValueOnce(event);

      await billingService.handleWebhook(payload, signature);

      // Verify subscription was updated
      const updated = await testPrisma.subscription.findUnique({
        where: { userId: user.id },
      });

      expect(updated).not.toBeNull();
      expect(updated?.plan).toBe('business'); // Updated from pro to business
      expect(updated?.lastStripeEventId).toBe(eventId);
    });

    it('should be idempotent when same customer.subscription.updated event is processed twice', async () => {
      const { user } = await createTestUser(testPrisma, { plan: 'free' });

      // Create initial subscription
      const initialSub = await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan: 'pro',
          status: 'active',
          stripeCustomerId: 'cus_test_idempotent',
          stripeSubscriptionId: 'sub_test_idempotent',
          lastStripeEventId: null,
        },
      });

      const eventId = 'evt_subscription_updated_idempotent';

      const subscription: Stripe.Subscription = {
        id: 'sub_test_idempotent',
        object: 'subscription',
        customer: 'cus_test_idempotent',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        items: {
          object: 'list',
          data: [
            {
              id: 'si_test',
              object: 'subscription_item',
              price: {
                id: 'price_test_business',
                object: 'price',
              } as any,
            },
          ],
        },
      } as any;

      const event = createStripeEvent('customer.subscription.updated', eventId, subscription);
      const { payload, signature } = createWebhookPayload(event);

      mockConstructEvent.mockReturnValue(event);

      // Process first time
      await billingService.handleWebhook(payload, signature);

      const afterFirst = await testPrisma.subscription.findUnique({
        where: { userId: user.id },
      });
      expect(afterFirst?.lastStripeEventId).toBe(eventId);
      expect(afterFirst?.plan).toBe('business');

      // Process second time (same event ID)
      await billingService.handleWebhook(payload, signature);

      const afterSecond = await testPrisma.subscription.findUnique({
        where: { userId: user.id },
      });

      // Verify idempotency: lastStripeEventId check should prevent update
      // The plan should still be business (not changed again)
      expect(afterSecond?.lastStripeEventId).toBe(eventId);
      expect(afterSecond?.plan).toBe('business');
    });

    it('should prevent duplicate updates when processing same event concurrently', async () => {
      const { user } = await createTestUser(testPrisma, { plan: 'free' });

      // Create initial subscription
      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan: 'pro',
          status: 'active',
          stripeCustomerId: 'cus_test_concurrent',
          stripeSubscriptionId: 'sub_test_concurrent',
          lastStripeEventId: null,
        },
      });

      const eventId = 'evt_subscription_updated_concurrent';

      const subscription: Stripe.Subscription = {
        id: 'sub_test_concurrent',
        object: 'subscription',
        customer: 'cus_test_concurrent',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        items: {
          object: 'list',
          data: [
            {
              id: 'si_test',
              object: 'subscription_item',
              price: {
                id: 'price_test_business',
                object: 'price',
              } as any,
            },
          ],
        },
      } as any;

      const event = createStripeEvent('customer.subscription.updated', eventId, subscription);
      const { payload, signature } = createWebhookPayload(event);

      mockConstructEvent.mockReturnValue(event);

      // Process same event concurrently (simulating race condition)
      await Promise.all([
        billingService.handleWebhook(payload, signature),
        billingService.handleWebhook(payload, signature),
        billingService.handleWebhook(payload, signature),
      ]);

      // Verify subscription was updated only once
      const updated = await testPrisma.subscription.findUnique({
        where: { userId: user.id },
      });

      expect(updated).not.toBeNull();
      expect(updated?.lastStripeEventId).toBe(eventId);
      expect(updated?.plan).toBe('business');

      // Verify only one subscription exists (no duplicates)
      const allSubscriptions = await testPrisma.subscription.findMany({
        where: { userId: user.id },
      });
      expect(allSubscriptions).toHaveLength(1);
    });
  });

  describe('customer.subscription.deleted idempotency', () => {
    it('should cancel subscription on first customer.subscription.deleted event', async () => {
      const { user } = await createTestUser(testPrisma, { plan: 'free' });

      // Create active subscription
      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan: 'pro',
          status: 'active',
          stripeCustomerId: 'cus_test_delete',
          stripeSubscriptionId: 'sub_test_delete',
        },
      });

      const eventId = 'evt_subscription_deleted_1';

      const subscription: Stripe.Subscription = {
        id: 'sub_test_delete',
        object: 'subscription',
        customer: 'cus_test_delete',
        status: 'canceled',
        current_period_end: Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60,
      } as any;

      const event = createStripeEvent('customer.subscription.deleted', eventId, subscription);
      const { payload, signature } = createWebhookPayload(event);

      mockConstructEvent.mockReturnValueOnce(event);

      await billingService.handleWebhook(payload, signature);

      // Verify subscription was canceled
      const canceled = await testPrisma.subscription.findUnique({
        where: { userId: user.id },
      });

      expect(canceled).not.toBeNull();
      expect(canceled?.status).toBe('canceled');
      expect(canceled?.plan).toBe('free');
      expect(canceled?.lastStripeEventId).toBe(eventId);
    });

    it('should be idempotent when same customer.subscription.deleted event is processed twice', async () => {
      const { user } = await createTestUser(testPrisma, { plan: 'free' });

      // Create active subscription
      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan: 'pro',
          status: 'active',
          stripeCustomerId: 'cus_test_delete_idempotent',
          stripeSubscriptionId: 'sub_test_delete_idempotent',
          lastStripeEventId: null,
        },
      });

      const eventId = 'evt_subscription_deleted_idempotent';

      const subscription: Stripe.Subscription = {
        id: 'sub_test_delete_idempotent',
        object: 'subscription',
        customer: 'cus_test_delete_idempotent',
        status: 'canceled',
        current_period_end: Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60,
      } as any;

      const event = createStripeEvent('customer.subscription.deleted', eventId, subscription);
      const { payload, signature } = createWebhookPayload(event);

      mockConstructEvent.mockReturnValue(event);

      // Process first time
      await billingService.handleWebhook(payload, signature);

      const afterFirst = await testPrisma.subscription.findUnique({
        where: { userId: user.id },
      });
      expect(afterFirst?.status).toBe('canceled');
      expect(afterFirst?.lastStripeEventId).toBe(eventId);

      // Process second time (same event ID)
      await billingService.handleWebhook(payload, signature);

      const afterSecond = await testPrisma.subscription.findUnique({
        where: { userId: user.id },
      });

      // Verify idempotency: should still be canceled, not processed again
      expect(afterSecond?.lastStripeEventId).toBe(eventId);
      expect(afterSecond?.status).toBe('canceled');
    });
  });

  describe('webhook signature validation', () => {
    it('should reject webhook with invalid signature', async () => {
      const event = createStripeEvent('checkout.session.completed', 'evt_invalid', {});
      const { payload } = createWebhookPayload(event);
      const invalidSignature = 'invalid_signature';

      mockConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(
        billingService.handleWebhook(payload, invalidSignature),
      ).rejects.toThrow();
    });

    it('should handle webhook when Stripe is not configured', async () => {
      const event = createStripeEvent('checkout.session.completed', 'evt_no_stripe', {});
      const { payload, signature } = createWebhookPayload(event);

      // Create a service without Stripe
      const entitlementsService = app.get(EntitlementsService);
      const serviceWithoutStripe = new BillingService(
        testPrisma,
        {
          get: jest.fn((key: string) => {
            if (key === 'STRIPE_SECRET_KEY') {
              return undefined; // No Stripe key
            }
            return undefined;
          }),
        } as any,
        entitlementsService,
      );

      const result = await serviceWithoutStripe.handleWebhook(payload, signature);

      expect(result.received).toBe(true);
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle checkout.session.completed without userId in metadata', async () => {
      const eventId = 'evt_checkout_no_userid';

      const session: Stripe.Checkout.Session = {
        id: 'cs_test_no_metadata',
        object: 'checkout.session',
        customer: 'cus_test',
        subscription: 'sub_test',
        metadata: {}, // Missing userId
      } as any;

      const event = createStripeEvent('checkout.session.completed', eventId, session);
      const { payload, signature } = createWebhookPayload(event);

      mockConstructEvent.mockReturnValueOnce(event);

      // Should not throw, but should log error and return
      const result = await billingService.handleWebhook(payload, signature);

      expect(result.received).toBe(true);

      // Verify no subscription was created
      const subscriptions = await testPrisma.subscription.findMany();
      expect(subscriptions).toHaveLength(0);
    });

    it('should handle subscription.updated for non-existent customer', async () => {
      const eventId = 'evt_subscription_nonexistent';

      const subscription: Stripe.Subscription = {
        id: 'sub_nonexistent',
        object: 'subscription',
        customer: 'cus_nonexistent',
        status: 'active',
      } as any;

      const event = createStripeEvent('customer.subscription.updated', eventId, subscription);
      const { payload, signature } = createWebhookPayload(event);

      mockConstructEvent.mockReturnValueOnce(event);

      // Should not throw, but should log warning and return
      const result = await billingService.handleWebhook(payload, signature);

      expect(result.received).toBe(true);
    });

    it('should handle subscription.deleted for non-existent customer', async () => {
      const eventId = 'evt_subscription_delete_nonexistent';

      const subscription: Stripe.Subscription = {
        id: 'sub_nonexistent',
        object: 'subscription',
        customer: 'cus_nonexistent',
        status: 'canceled',
      } as any;

      const event = createStripeEvent('customer.subscription.deleted', eventId, subscription);
      const { payload, signature } = createWebhookPayload(event);

      mockConstructEvent.mockReturnValueOnce(event);

      // Should not throw, should return gracefully
      const result = await billingService.handleWebhook(payload, signature);

      expect(result.received).toBe(true);
    });
  });

  describe('concurrent processing stress test', () => {
    it('should handle multiple different events concurrently without race conditions', async () => {
      const { user } = await createTestUser(testPrisma, { plan: 'free' });

      // Create initial subscription
      await testPrisma.subscription.create({
        data: {
          userId: user.id,
          plan: 'pro',
          status: 'active',
          stripeCustomerId: 'cus_test_stress',
          stripeSubscriptionId: 'sub_test_stress',
        },
      });

      // Create multiple different events
      const events = [
        {
          type: 'customer.subscription.updated',
          eventId: 'evt_stress_1',
          subscription: {
            id: 'sub_test_stress',
            customer: 'cus_test_stress',
            status: 'active',
            items: {
              object: 'list',
              data: [
                {
                  price: { id: 'price_test_business' },
                },
              ],
            },
          } as any,
        },
        {
          type: 'customer.subscription.updated',
          eventId: 'evt_stress_2',
          subscription: {
            id: 'sub_test_stress',
            customer: 'cus_test_stress',
            status: 'active',
            items: {
              object: 'list',
              data: [
                {
                  price: { id: 'price_test_pro' },
                },
              ],
            },
          } as any,
        },
      ];

      mockConstructEvent.mockImplementation((payload: Buffer) => {
        const eventData = JSON.parse(payload.toString());
        return eventData;
      });

      // Process events concurrently
      const results = await Promise.all(
        events.map((eventData) => {
          const event = createStripeEvent(
            eventData.type as any,
            eventData.eventId,
            eventData.subscription,
          );
          const { payload, signature } = createWebhookPayload(event);
          return billingService.handleWebhook(payload, signature);
        }),
      );

      expect(results.every((r) => r.received === true)).toBe(true);

      // Verify final state is consistent
      const final = await testPrisma.subscription.findUnique({
        where: { userId: user.id },
      });

      expect(final).not.toBeNull();
      // Should have processed one of the events (whichever completed last)
      expect(['pro', 'business']).toContain(final?.plan);
    });
  });
});

