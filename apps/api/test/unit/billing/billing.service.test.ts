/**
 * Unit tests for BillingService
 *
 * Tests:
 * - getPlans() returns all available plans
 * - getSubscription() returns subscription or default free plan
 * - getBillingSummary() returns billing summary
 * - createCheckoutSession() creates checkout session
 * - createCheckoutSession() redirects to portal if subscription exists
 * - createPortalSession() creates portal session
 * - updateSubscription() updates subscription
 * - cancelSubscription() cancels subscription
 */
import { BillingService } from '../../../src/billing/billing.service';
import { PrismaService } from '../../../src/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EntitlementsService } from '../../../src/billing/entitlements.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Mock Stripe - only create instance when apiKey is provided
jest.mock('stripe', () => {
  return jest.fn().mockImplementation((apiKey) => {
    // When apiKey is empty/undefined, the service won't call new Stripe()
    // But if it does, return a mock object
    return {
      checkout: {
        sessions: {
          create: jest.fn(),
        },
      },
      billingPortal: {
        sessions: {
          create: jest.fn(),
        },
      },
      customers: {
        create: jest.fn(),
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
    };
  });
});

const createPrismaMock = () => ({
  subscription: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
});

const createConfigMock = (
  overrides: Record<string, string | undefined> = {}
) => {
  const defaults = {
    STRIPE_SECRET_KEY: 'sk_test_key',
    STRIPE_PRICE_PRO: 'price_pro',
    STRIPE_PRICE_BUSINESS: 'price_business',
    FRONTEND_URL: 'http://localhost:3000',
  };
  return {
    get: jest.fn((key: string) => {
      if (key in overrides) {
        return overrides[key]; // Return undefined if explicitly set to undefined
      }
      return defaults[key] || '';
    }),
  } as unknown as ConfigService;
};

const createEntitlementsServiceMock = () => ({
  getEntitlementsSummary: jest.fn(),
});

describe('BillingService', () => {
  let service: BillingService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let configMock: ConfigService;
  let entitlementsServiceMock: ReturnType<typeof createEntitlementsServiceMock>;
  let Stripe: any;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    configMock = createConfigMock();
    entitlementsServiceMock = createEntitlementsServiceMock();
    Stripe = require('stripe');
    service = new BillingService(
      prismaMock as unknown as PrismaService,
      configMock,
      entitlementsServiceMock as unknown as EntitlementsService
    );
  });

  describe('getPlans', () => {
    it('should return all available plans', () => {
      const plans = service.getPlans();

      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThan(0);
      expect(plans[0]).toHaveProperty('id');
      expect(plans[0]).toHaveProperty('name');
    });
  });

  describe('getSubscription', () => {
    it('should return subscription when it exists', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        plan: 'pro',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await service.getSubscription('user-1');

      expect(result).toEqual(mockSubscription);
      expect(prismaMock.subscription.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should return default free subscription when none exists', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue(null);

      const result = await service.getSubscription('user-1');

      expect(result).toEqual({
        plan: 'free',
        status: 'active',
        currentPeriodStart: null,
        currentPeriodEnd: null,
      });
    });
  });

  describe('getBillingSummary', () => {
    it('should return billing summary with entitlements', async () => {
      const mockSubscription = {
        plan: 'pro',
        status: 'active',
        currentPeriodEnd: new Date(),
      };

      const mockEntitlements = {
        plan: 'pro',
        limits: {
          projects: 10,
          products: 100,
        },
        usage: {
          projects: 2,
          products: 20,
        },
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);
      entitlementsServiceMock.getEntitlementsSummary.mockResolvedValue(
        mockEntitlements
      );

      const result = await service.getBillingSummary('user-1');

      expect(result).toHaveProperty('plan', 'pro');
      expect(result).toHaveProperty('status', 'active');
      expect(result).toHaveProperty('limits');
      expect(result).toHaveProperty('usage');
      expect(result).toHaveProperty('currentPeriodEnd');
    });
  });

  describe('createCheckoutSession', () => {
    it('should throw BadRequestException when Stripe is not configured', async () => {
      const config = createConfigMock({ STRIPE_SECRET_KEY: undefined });
      const serviceWithoutStripe = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      // The check happens at the start of createCheckoutSession (line 82)
      // It checks if (!this.stripe) and throws BadRequestException
      await expect(
        serviceWithoutStripe.createCheckoutSession('user-1', 'pro')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for free plan', async () => {
      await expect(
        service.createCheckoutSession('user-1', 'free')
      ).rejects.toThrow(BadRequestException);
    });

    it('should redirect to portal if active subscription exists', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        stripeSubscriptionId: 'stripe_sub_1',
        stripeCustomerId: 'cus_123',
        status: 'active',
      };

      prismaMock.subscription.findFirst.mockResolvedValue(mockSubscription);
      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);
      const mockStripeInstance = (service as any).stripe;
      mockStripeInstance.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/portal',
      });

      const result = await service.createCheckoutSession('user-1', 'pro');

      expect(result.url).toBe('https://billing.stripe.com/portal');
      expect(
        mockStripeInstance.checkout.sessions.create
      ).not.toHaveBeenCalled();
    });

    it('should create checkout session when no active subscription exists', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
      };

      prismaMock.subscription.findFirst.mockResolvedValue(null);
      prismaMock.subscription.findUnique.mockResolvedValue(null);
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const mockStripeInstance = (service as any).stripe;
      mockStripeInstance.customers.create.mockResolvedValue({ id: 'cus_123' });
      prismaMock.subscription.create.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        stripeCustomerId: 'cus_123',
      });
      mockStripeInstance.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session',
      });

      const result = await service.createCheckoutSession('user-1', 'pro');

      expect(result.url).toBe('https://checkout.stripe.com/session');
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalled();
    });
  });

  describe('createPortalSession', () => {
    it('should throw BadRequestException when Stripe is not configured', async () => {
      const config = createConfigMock({ STRIPE_SECRET_KEY: '' });
      const service = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      await expect(service.createPortalSession('user-1')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when no Stripe customer found', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue(null);

      await expect(service.createPortalSession('user-1')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should create portal session when customer exists', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        stripeCustomerId: 'cus_123',
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);
      const mockStripeInstance = (service as any).stripe;
      mockStripeInstance.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/portal',
      });

      const result = await service.createPortalSession('user-1');

      expect(result.url).toBe('https://billing.stripe.com/portal');
      expect(
        mockStripeInstance.billingPortal.sessions.create
      ).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'http://localhost:3000/settings/billing',
      });
    });
  });

  describe('updateSubscription', () => {
    it('should throw BadRequestException for invalid plan', async () => {
      await expect(
        service.updateSubscription('user-1', 'invalid-plan')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.updateSubscription('user-1', 'pro')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should update existing subscription', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
      };

      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        plan: 'free',
        status: 'active',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);
      prismaMock.subscription.update.mockResolvedValue({
        ...mockSubscription,
        plan: 'pro',
      });

      const result = await service.updateSubscription('user-1', 'pro');

      expect(result.plan).toBe('pro');
      expect(prismaMock.subscription.update).toHaveBeenCalled();
    });

    it('should create subscription when none exists', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.subscription.findUnique.mockResolvedValue(null);
      prismaMock.subscription.create.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        plan: 'pro',
        status: 'active',
      });

      const result = await service.updateSubscription('user-1', 'pro');

      expect(result.plan).toBe('pro');
      expect(prismaMock.subscription.create).toHaveBeenCalled();
    });
  });

  describe('cancelSubscription', () => {
    it('should throw NotFoundException when subscription not found', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue(null);

      await expect(service.cancelSubscription('user-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should cancel subscription', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        plan: 'pro',
        status: 'active',
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);
      prismaMock.subscription.update.mockResolvedValue({
        ...mockSubscription,
        status: 'canceled',
      });

      const result = await service.cancelSubscription('user-1');

      expect(result.status).toBe('canceled');
      expect(prismaMock.subscription.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { status: 'canceled' },
      });
    });
  });

  describe('handleWebhook', () => {
    it('should return received when Stripe is not configured', async () => {
      const config = createConfigMock({ STRIPE_SECRET_KEY: undefined });
      const serviceWithoutStripe = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await serviceWithoutStripe.handleWebhook(
        Buffer.from('{}'),
        'sig_123'
      );

      expect(result).toEqual({ received: true });
      (console.warn as jest.Mock).mockRestore();
    });

    it('should return received when webhook secret is not set', async () => {
      const config = createConfigMock({
        STRIPE_SECRET_KEY: 'sk_test_key',
        STRIPE_WEBHOOK_SECRET: undefined,
      });
      const serviceWithNoSecret = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await serviceWithNoSecret.handleWebhook(
        Buffer.from('{}'),
        'sig_123'
      );

      expect(result).toEqual({ received: true });
      (console.warn as jest.Mock).mockRestore();
    });

    it('should throw BadRequestException on signature verification failure', async () => {
      const config = createConfigMock({
        STRIPE_SECRET_KEY: 'sk_test_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
      });
      const serviceWithSecret = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      const mockStripeInstance = (serviceWithSecret as any).stripe;
      mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        serviceWithSecret.handleWebhook(Buffer.from('{}'), 'invalid_sig')
      ).rejects.toThrow(BadRequestException);

      (console.error as jest.Mock).mockRestore();
    });

    it('should handle checkout.session.completed event', async () => {
      const config = createConfigMock({
        STRIPE_SECRET_KEY: 'sk_test_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
      });
      const serviceWithSecret = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      const mockEvent = {
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            metadata: { userId: 'user-1', planId: 'pro' },
            subscription: 'sub_123',
            customer: 'cus_123',
          },
        },
      };

      const mockStripeInstance = (serviceWithSecret as any).stripe;
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      prismaMock.subscription.findUnique.mockResolvedValue(null);
      prismaMock.subscription.upsert.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        plan: 'pro',
      });
      prismaMock.subscription.update.mockResolvedValue({});

      jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await serviceWithSecret.handleWebhook(
        Buffer.from('{}'),
        'sig_123'
      );

      expect(result).toEqual({ received: true });
      expect(prismaMock.subscription.upsert).toHaveBeenCalled();

      (console.log as jest.Mock).mockRestore();
    });

    it('should handle customer.subscription.updated event', async () => {
      const config = createConfigMock({
        STRIPE_SECRET_KEY: 'sk_test_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
        STRIPE_PRICE_PRO: 'price_pro',
      });
      const serviceWithSecret = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      const mockEvent = {
        id: 'evt_123',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
            items: {
              data: [{ price: { id: 'price_pro' } }],
            },
          },
        },
      };

      const mockStripeInstance = (serviceWithSecret as any).stripe;
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      prismaMock.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        stripeCustomerId: 'cus_123',
      });
      prismaMock.subscription.update.mockResolvedValue({});

      jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await serviceWithSecret.handleWebhook(
        Buffer.from('{}'),
        'sig_123'
      );

      expect(result).toEqual({ received: true });
      expect(prismaMock.subscription.update).toHaveBeenCalled();

      (console.log as jest.Mock).mockRestore();
    });

    it('should handle customer.subscription.deleted event', async () => {
      const config = createConfigMock({
        STRIPE_SECRET_KEY: 'sk_test_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
      });
      const serviceWithSecret = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      const mockEvent = {
        id: 'evt_123',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          },
        },
      };

      const mockStripeInstance = (serviceWithSecret as any).stripe;
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      prismaMock.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        stripeCustomerId: 'cus_123',
        currentPeriodEnd: new Date(),
      });
      prismaMock.subscription.update.mockResolvedValue({});

      jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await serviceWithSecret.handleWebhook(
        Buffer.from('{}'),
        'sig_123'
      );

      expect(result).toEqual({ received: true });
      expect(prismaMock.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: 'free',
            status: 'canceled',
          }),
        })
      );

      (console.log as jest.Mock).mockRestore();
    });

    it('should handle unrecognized event types gracefully', async () => {
      const config = createConfigMock({
        STRIPE_SECRET_KEY: 'sk_test_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
      });
      const serviceWithSecret = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      const mockEvent = {
        id: 'evt_123',
        type: 'invoice.payment_succeeded',
        data: { object: {} },
      };

      const mockStripeInstance = (serviceWithSecret as any).stripe;
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

      jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await serviceWithSecret.handleWebhook(
        Buffer.from('{}'),
        'sig_123'
      );

      expect(result).toEqual({ received: true });

      (console.log as jest.Mock).mockRestore();
    });

    it('should skip duplicate events (idempotency)', async () => {
      const config = createConfigMock({
        STRIPE_SECRET_KEY: 'sk_test_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
      });
      const serviceWithSecret = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      const mockEvent = {
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            metadata: { userId: 'user-1', planId: 'pro' },
            subscription: 'sub_123',
            customer: 'cus_123',
          },
        },
      };

      const mockStripeInstance = (serviceWithSecret as any).stripe;
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      // Return existing subscription with same event ID
      prismaMock.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        lastStripeEventId: 'evt_123', // Same event ID
      });

      jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await serviceWithSecret.handleWebhook(
        Buffer.from('{}'),
        'sig_123'
      );

      expect(result).toEqual({ received: true });
      expect(prismaMock.subscription.upsert).not.toHaveBeenCalled();

      (console.log as jest.Mock).mockRestore();
    });
  });

  describe('createCheckoutSession - price not configured', () => {
    it('should throw BadRequestException when price not configured', async () => {
      const config = createConfigMock({
        STRIPE_SECRET_KEY: 'sk_test_key',
        STRIPE_PRICE_PRO: undefined,
      });
      const serviceWithNoPrice = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      prismaMock.subscription.findFirst.mockResolvedValue(null);

      await expect(
        serviceWithNoPrice.createCheckoutSession('user-1', 'pro')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaMock.subscription.findFirst.mockResolvedValue(null);
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession('user-1', 'pro')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBillingSummary - free plan', () => {
    it('should return active status for free plan regardless of subscription status', async () => {
      const mockEntitlements = {
        plan: 'free',
        limits: { projects: 1 },
        usage: { projects: 0 },
      };

      prismaMock.subscription.findUnique.mockResolvedValue(null);
      entitlementsServiceMock.getEntitlementsSummary.mockResolvedValue(
        mockEntitlements
      );

      const result = await service.getBillingSummary('user-1');

      expect(result.plan).toBe('free');
      expect(result.status).toBe('active');
    });
  });

  describe('handleWebhook - subscription.updated edge cases', () => {
    it('should return early when customer ID is missing in subscription.updated', async () => {
      const config = createConfigMock({
        STRIPE_SECRET_KEY: 'sk_test_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
      });
      const serviceWithSecret = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      const mockEvent = {
        id: 'evt_123',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            customer: '', // Empty customer ID
            status: 'active',
            items: { data: [] },
          },
        },
      };

      const mockStripeInstance = (serviceWithSecret as any).stripe;
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await serviceWithSecret.handleWebhook(
        Buffer.from('{}'),
        'sig_123'
      );

      expect(result).toEqual({ received: true });
      expect(prismaMock.subscription.update).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('should return early when no subscription found for customer', async () => {
      const config = createConfigMock({
        STRIPE_SECRET_KEY: 'sk_test_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
      });
      const serviceWithSecret = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      const mockEvent = {
        id: 'evt_123',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_unknown',
            status: 'active',
            items: { data: [] },
          },
        },
      };

      const mockStripeInstance = (serviceWithSecret as any).stripe;
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      prismaMock.subscription.findFirst.mockResolvedValue(null);

      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await serviceWithSecret.handleWebhook(
        Buffer.from('{}'),
        'sig_123'
      );

      expect(result).toEqual({ received: true });
      expect(prismaMock.subscription.update).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('should skip duplicate events (idempotency) for subscription.updated', async () => {
      const config = createConfigMock({
        STRIPE_SECRET_KEY: 'sk_test_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
      });
      const serviceWithSecret = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      const mockEvent = {
        id: 'evt_duplicate',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            items: { data: [] },
          },
        },
      };

      const mockStripeInstance = (serviceWithSecret as any).stripe;
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      prismaMock.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        stripeCustomerId: 'cus_123',
        lastStripeEventId: 'evt_duplicate', // Same event ID
      });

      jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await serviceWithSecret.handleWebhook(
        Buffer.from('{}'),
        'sig_123'
      );

      expect(result).toEqual({ received: true });
      expect(prismaMock.subscription.update).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('should handle business plan price in subscription.updated', async () => {
      const config = createConfigMock({
        STRIPE_SECRET_KEY: 'sk_test_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
        STRIPE_PRICE_PRO: 'price_pro',
        STRIPE_PRICE_BUSINESS: 'price_business',
      });
      const serviceWithSecret = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      const mockEvent = {
        id: 'evt_123',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
            items: {
              data: [{ price: { id: 'price_business' } }],
            },
          },
        },
      };

      const mockStripeInstance = (serviceWithSecret as any).stripe;
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      prismaMock.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        stripeCustomerId: 'cus_123',
      });
      prismaMock.subscription.update.mockResolvedValue({});

      jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await serviceWithSecret.handleWebhook(
        Buffer.from('{}'),
        'sig_123'
      );

      expect(result).toEqual({ received: true });
      expect(prismaMock.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: 'business',
          }),
        })
      );

      jest.restoreAllMocks();
    });

    it('should handle customer.subscription.created event', async () => {
      const config = createConfigMock({
        STRIPE_SECRET_KEY: 'sk_test_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
        STRIPE_PRICE_PRO: 'price_pro',
      });
      const serviceWithSecret = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      const mockEvent = {
        id: 'evt_123',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
            items: {
              data: [{ price: { id: 'price_pro' } }],
            },
          },
        },
      };

      const mockStripeInstance = (serviceWithSecret as any).stripe;
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      prismaMock.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        stripeCustomerId: 'cus_123',
      });
      prismaMock.subscription.update.mockResolvedValue({});

      jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await serviceWithSecret.handleWebhook(
        Buffer.from('{}'),
        'sig_123'
      );

      expect(result).toEqual({ received: true });
      expect(prismaMock.subscription.update).toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });

  describe('handleWebhook - subscription.deleted edge cases', () => {
    it('should return early when customer ID is missing in subscription.deleted', async () => {
      const config = createConfigMock({
        STRIPE_SECRET_KEY: 'sk_test_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
      });
      const serviceWithSecret = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      const mockEvent = {
        id: 'evt_123',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
            customer: '', // Empty customer ID
          },
        },
      };

      const mockStripeInstance = (serviceWithSecret as any).stripe;
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await serviceWithSecret.handleWebhook(
        Buffer.from('{}'),
        'sig_123'
      );

      expect(result).toEqual({ received: true });
      expect(prismaMock.subscription.update).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('should return early when no subscription found for deleted event', async () => {
      const config = createConfigMock({
        STRIPE_SECRET_KEY: 'sk_test_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
      });
      const serviceWithSecret = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      const mockEvent = {
        id: 'evt_123',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_unknown',
          },
        },
      };

      const mockStripeInstance = (serviceWithSecret as any).stripe;
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      prismaMock.subscription.findFirst.mockResolvedValue(null);

      jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await serviceWithSecret.handleWebhook(
        Buffer.from('{}'),
        'sig_123'
      );

      expect(result).toEqual({ received: true });
      expect(prismaMock.subscription.update).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('should skip duplicate events (idempotency) for subscription.deleted', async () => {
      const config = createConfigMock({
        STRIPE_SECRET_KEY: 'sk_test_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
      });
      const serviceWithSecret = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      const mockEvent = {
        id: 'evt_duplicate',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
          },
        },
      };

      const mockStripeInstance = (serviceWithSecret as any).stripe;
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      prismaMock.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        stripeCustomerId: 'cus_123',
        lastStripeEventId: 'evt_duplicate', // Same event ID
      });

      jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await serviceWithSecret.handleWebhook(
        Buffer.from('{}'),
        'sig_123'
      );

      expect(result).toEqual({ received: true });
      expect(prismaMock.subscription.update).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });

  describe('handleWebhook - checkout.session.completed edge cases', () => {
    it('should return early when metadata is missing in checkout session', async () => {
      const config = createConfigMock({
        STRIPE_SECRET_KEY: 'sk_test_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
      });
      const serviceWithSecret = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      const mockEvent = {
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            metadata: {}, // Missing userId and planId
            subscription: 'sub_123',
            customer: 'cus_123',
          },
        },
      };

      const mockStripeInstance = (serviceWithSecret as any).stripe;
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await serviceWithSecret.handleWebhook(
        Buffer.from('{}'),
        'sig_123'
      );

      expect(result).toEqual({ received: true });
      expect(prismaMock.subscription.upsert).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });

  describe('handleWebhook - Stripe status mappings', () => {
    it.each([
      ['trialing', 'active'],
      ['past_due', 'past_due'],
      ['unpaid', 'past_due'],
      ['canceled', 'canceled'],
      ['incomplete_expired', 'canceled'],
      ['paused', 'past_due'], // default case
    ])(
      'should map Stripe status "%s" to internal status "%s"',
      async (stripeStatus, expectedStatus) => {
        const config = createConfigMock({
          STRIPE_SECRET_KEY: 'sk_test_key',
          STRIPE_WEBHOOK_SECRET: 'whsec_test',
          STRIPE_PRICE_PRO: 'price_pro',
        });
        const serviceWithSecret = new BillingService(
          prismaMock as unknown as PrismaService,
          config,
          entitlementsServiceMock as unknown as EntitlementsService
        );

        const mockEvent = {
          id: `evt_${stripeStatus}`,
          type: 'customer.subscription.updated',
          data: {
            object: {
              id: 'sub_123',
              customer: 'cus_123',
              status: stripeStatus,
              current_period_start: Math.floor(Date.now() / 1000),
              current_period_end: Math.floor(Date.now() / 1000) + 2592000,
              items: {
                data: [{ price: { id: 'price_pro' } }],
              },
            },
          },
        };

        const mockStripeInstance = (serviceWithSecret as any).stripe;
        mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
        prismaMock.subscription.findFirst.mockResolvedValue({
          id: 'sub-1',
          userId: 'user-1',
          stripeCustomerId: 'cus_123',
        });
        prismaMock.subscription.update.mockResolvedValue({});

        jest.spyOn(console, 'log').mockImplementation(() => {});

        await serviceWithSecret.handleWebhook(Buffer.from('{}'), 'sig_123');

        expect(prismaMock.subscription.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: expectedStatus,
            }),
          })
        );

        jest.restoreAllMocks();
      }
    );
  });

  describe('createCheckoutSession - existing customer', () => {
    it('should use existing Stripe customer ID when available', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
      };

      const existingSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        stripeCustomerId: 'cus_existing',
        plan: 'free',
        status: 'active',
      };

      prismaMock.subscription.findFirst.mockResolvedValue(null); // No active subscription
      prismaMock.subscription.findUnique.mockResolvedValue(existingSubscription);
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const mockStripeInstance = (service as any).stripe;
      mockStripeInstance.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session',
      });

      const result = await service.createCheckoutSession('user-1', 'pro');

      expect(result.url).toBe('https://checkout.stripe.com/session');
      expect(mockStripeInstance.customers.create).not.toHaveBeenCalled();
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing',
        })
      );
    });
  });

  describe('handleWebhook - error propagation', () => {
    it('should propagate errors from webhook handlers', async () => {
      const config = createConfigMock({
        STRIPE_SECRET_KEY: 'sk_test_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
      });
      const serviceWithSecret = new BillingService(
        prismaMock as unknown as PrismaService,
        config,
        entitlementsServiceMock as unknown as EntitlementsService
      );

      const mockEvent = {
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            metadata: { userId: 'user-1', planId: 'pro' },
            subscription: 'sub_123',
            customer: 'cus_123',
          },
        },
      };

      const mockStripeInstance = (serviceWithSecret as any).stripe;
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      prismaMock.subscription.findUnique.mockResolvedValue(null);
      prismaMock.subscription.upsert.mockRejectedValue(
        new Error('Database error')
      );

      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        serviceWithSecret.handleWebhook(Buffer.from('{}'), 'sig_123')
      ).rejects.toThrow('Database error');

      jest.restoreAllMocks();
    });
  });

  describe('getOrCreateStripeCustomer - update existing subscription', () => {
    it('should update existing subscription with new Stripe customer ID', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
      };

      const existingSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        stripeCustomerId: null, // No customer ID yet
        plan: 'free',
        status: 'active',
      };

      prismaMock.subscription.findFirst.mockResolvedValue(null);
      prismaMock.subscription.findUnique.mockResolvedValue(existingSubscription);
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const mockStripeInstance = (service as any).stripe;
      mockStripeInstance.customers.create.mockResolvedValue({ id: 'cus_new' });
      prismaMock.subscription.update.mockResolvedValue({
        ...existingSubscription,
        stripeCustomerId: 'cus_new',
      });
      mockStripeInstance.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session',
      });

      const result = await service.createCheckoutSession('user-1', 'pro');

      expect(result.url).toBe('https://checkout.stripe.com/session');
      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: { userId: 'user-1' },
      });
      expect(prismaMock.subscription.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { stripeCustomerId: 'cus_new' },
      });
    });
  });
});
