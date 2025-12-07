import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';
import { PLANS, getPlanById, Plan, PlanId } from './plans';
import { EntitlementsService } from './entitlements.service';

@Injectable()
export class BillingService {
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly entitlementsService: EntitlementsService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    }
  }

  /**
   * Get all available plans
   */
  getPlans(): Plan[] {
    return PLANS;
  }

  /**
   * Get user's current subscription
   */
  async getSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      // Return a default "free" subscription for users without one
      return {
        plan: 'free',
        status: 'active',
        currentPeriodStart: null,
        currentPeriodEnd: null,
      };
    }

    return subscription;
  }

  /**
   * Billing summary for settings page (plan, status, limits, usage)
   */
  async getBillingSummary(userId: string) {
    const [subscription, entitlements] = await Promise.all([
      this.getSubscription(userId),
      this.entitlementsService.getEntitlementsSummary(userId),
    ]);
    return {
      plan: entitlements.plan,
      status: subscription.status ?? 'active',
      limits: entitlements.limits,
      usage: entitlements.usage,
      currentPeriodEnd: subscription.currentPeriodEnd ?? null,
    };
  }

  /**
   * Create a Stripe Checkout session for upgrading
   * Phase 1.2 — Launch-ready checkout session endpoint.
   */
  async createCheckoutSession(userId: string, planId: PlanId): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    if (planId === 'free') {
      throw new BadRequestException('Cannot checkout for free plan');
    }

    // Get price ID from environment variables via ConfigService
    const priceId =
      planId === 'pro'
        ? this.configService.get<string>('STRIPE_PRICE_PRO')
        : this.configService.get<string>('STRIPE_PRICE_BUSINESS');

    if (!priceId) {
      throw new BadRequestException(`Stripe price not configured for plan: ${planId}`);
    }

    // Get or create Stripe customer
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let customerId = await this.getOrCreateStripeCustomer(userId, user.email);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/settings/billing?success=true`,
      cancel_url: `${frontendUrl}/settings/billing?canceled=true`,
      metadata: { userId, planId },
    });

    return { url: session.url! };
  }

  /**
   * Create a Stripe Billing Portal session for managing subscription
   */
  async createPortalSession(userId: string): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new BadRequestException('No Stripe customer found');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${frontendUrl}/settings/billing`,
    });

    return { url: session.url };
  }

  /**
   * Get or create a Stripe customer for a user
   */
  private async getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (subscription?.stripeCustomerId) {
      return subscription.stripeCustomerId;
    }

    // Create new Stripe customer
    const customer = await this.stripe!.customers.create({
      email,
      metadata: { userId },
    });

    // Store customer ID
    if (subscription) {
      await this.prisma.subscription.update({
        where: { userId },
        data: { stripeCustomerId: customer.id },
      });
    } else {
      await this.prisma.subscription.create({
        data: {
          userId,
          plan: 'free',
          status: 'active',
          stripeCustomerId: customer.id,
        },
      });
    }

    return customer.id;
  }

  /**
   * Create or update user's subscription (legacy - kept for admin/testing)
   */
  async updateSubscription(userId: string, planId: string) {
    const plan = getPlanById(planId);
    if (!plan) {
      throw new BadRequestException(`Invalid plan: ${planId}`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    const now = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    if (existingSubscription) {
      return this.prisma.subscription.update({
        where: { userId },
        data: {
          plan: planId,
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });
    }

    return this.prisma.subscription.create({
      data: {
        userId,
        plan: planId,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  /**
   * Cancel user's subscription (legacy - use portal instead)
   */
  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    return this.prisma.subscription.update({
      where: { userId },
      data: {
        status: 'canceled',
      },
    });
  }

  /**
   * Handle Stripe webhook events (v1 - inline, idempotent)
   */
  async handleWebhook(payload: Buffer, signature: string) {
    if (!this.stripe) {
      console.warn('Stripe webhook received but Stripe is not configured');
      return { received: true };
    }

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.warn('Stripe webhook received but STRIPE_WEBHOOK_SECRET is not set');
      return { received: true };
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      throw new BadRequestException('Webhook signature verification failed');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionUpdated(subscription, event.id);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionDeleted(subscription, event.id);
        break;
      }
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;

    if (!userId || !planId) {
      console.error('Missing userId or planId in checkout session metadata');
      return;
    }

    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;

    await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        plan: planId,
        status: 'active',
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // ~30 days
      },
      create: {
        userId,
        plan: planId,
        status: 'active',
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await this.applySubscriptionEntitlements(userId, planId as PlanId, 'active');
  }

  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
    eventId: string,
  ) {
    const customerId = subscription.customer as string;

    if (!customerId) {
      console.warn('Subscription update received without customer id');
      return;
    }

    const existingSub = await this.prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!existingSub) {
      console.warn(`No subscription found for Stripe customer: ${customerId}`);
      return;
    }

    if (existingSub.lastStripeEventId === eventId) {
      // Idempotent: this event has already been applied
      return;
    }

    const firstItem = subscription.items?.data?.[0];
    const price = firstItem?.price;
    const priceId = typeof price === 'string' ? price : price?.id;
    const mappedPlanId = this.mapPriceIdToPlanId(priceId);

    const status = this.mapStripeSubscriptionStatus(subscription.status);
    const currentPeriodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000)
      : null;
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null;

    const updateData: Record<string, unknown> = {
      status,
      currentPeriodStart,
      currentPeriodEnd,
      stripeSubscriptionId: subscription.id,
      lastStripeEventId: eventId,
    };

    if (mappedPlanId) {
      updateData.plan = mappedPlanId;
    }

    if (!existingSub.stripeCustomerId) {
      updateData.stripeCustomerId = customerId;
    }

    await this.prisma.subscription.update({
      where: { id: existingSub.id },
      data: updateData,
    });

    await this.applySubscriptionEntitlements(existingSub.userId, mappedPlanId, status);
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
    eventId: string,
  ) {
    const customerId = subscription.customer as string;

    if (!customerId) {
      console.warn('Subscription delete received without customer id');
      return;
    }

    const existingSub = await this.prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!existingSub) {
      return;
    }

    if (existingSub.lastStripeEventId === eventId) {
      // Idempotent: this event has already been applied
      return;
    }

    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : existingSub.currentPeriodEnd;

    // Downgrade to free plan and mark as canceled
    await this.prisma.subscription.update({
      where: { id: existingSub.id },
      data: {
        plan: 'free',
        status: 'canceled',
        stripeSubscriptionId: null,
        currentPeriodEnd,
        lastStripeEventId: eventId,
      },
    });

    await this.applySubscriptionEntitlements(existingSub.userId, 'free', 'canceled');
  }

  private async applySubscriptionEntitlements(
    userId: string,
    planId: PlanId | null,
    status: string,
  ): Promise<void> {
    const data: Record<string, unknown> = {
      status,
    };

    if (planId) {
      data.plan = planId;
    }

    await this.prisma.subscription.update({
      where: { userId },
      data,
    });
  }

  private mapPriceIdToPlanId(priceId: string | null | undefined): PlanId | null {
    if (!priceId) {
      return null;
    }

    // Get price IDs from ConfigService
    const proPriceId = this.configService.get<string>('STRIPE_PRICE_PRO');
    const businessPriceId = this.configService.get<string>('STRIPE_PRICE_BUSINESS');

    if (proPriceId && proPriceId === priceId) {
      return 'pro';
    }

    if (businessPriceId && businessPriceId === priceId) {
      return 'business';
    }

    return null;
  }

  private mapStripeSubscriptionStatus(
    subscriptionStatus: Stripe.Subscription.Status,
  ): string {
    switch (subscriptionStatus) {
      case 'active':
      case 'trialing':
        return 'active';
      case 'past_due':
      case 'unpaid':
        return 'past_due';
      case 'canceled':
      case 'incomplete_expired':
        return 'canceled';
      default:
        return 'past_due';
    }
  }
}
