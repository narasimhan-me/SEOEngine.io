import { Controller, Get, Post, Body, UseGuards, Request, Headers, RawBodyRequest, Req } from '@nestjs/common';
import { BillingService } from './billing.service';
import { EntitlementsService } from './entitlements.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanId } from './plans';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  /**
   * Get all available plans
   */
  @Get('plans')
  getPlans() {
    return this.billingService.getPlans();
  }

  /**
   * Get current user's subscription
   */
  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  async getSubscription(@Request() req: any) {
    return this.billingService.getSubscription(req.user.id);
  }

  /**
   * Get current user's entitlements (plan limits and usage)
   */
  @Get('entitlements')
  @UseGuards(JwtAuthGuard)
  async getEntitlements(@Request() req: any) {
    return this.entitlementsService.getEntitlementsSummary(req.user.id);
  }

  /**
   * Billing summary for settings page
   * Combines subscription and entitlements for the current user.
   */
  @Get('summary')
  @UseGuards(JwtAuthGuard)
  async getSummary(@Request() req: any) {
    const [subscription, entitlements] = await Promise.all([
      this.billingService.getSubscription(req.user.id),
      this.entitlementsService.getEntitlementsSummary(req.user.id),
    ]);
    return {
      plan: entitlements.plan,
      subscription,
      entitlements,
    };
  }

  /**
   * Create a Stripe Checkout session for upgrading
   */
  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @Request() req: any,
    @Body() body: { planId: PlanId },
  ) {
    return this.billingService.createCheckoutSession(req.user.id, body.planId);
  }

  /**
   * Create a Stripe Billing Portal session for managing subscription
   */
  @Post('create-portal-session')
  @UseGuards(JwtAuthGuard)
  async createPortalSession(@Request() req: any) {
    return this.billingService.createPortalSession(req.user.id);
  }

  /**
   * Update subscription to a new plan (legacy/admin)
   */
  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  async subscribe(@Request() req: any, @Body() body: { planId: string }) {
    return this.billingService.updateSubscription(req.user.id, body.planId);
  }

  /**
   * Cancel subscription (legacy - use portal instead)
   */
  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(@Request() req: any) {
    return this.billingService.cancelSubscription(req.user.id);
  }

  /**
   * Stripe webhook handler
   */
  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.billingService.handleWebhook(req.rawBody!, signature);
  }
}
