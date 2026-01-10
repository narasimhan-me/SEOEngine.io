import { Controller, Get, Post, Body, UseGuards, Request, Headers, RawBodyRequest, Req, ForbiddenException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { EntitlementsService } from './entitlements.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanId } from './plans';
import { ConfigService } from '@nestjs/config';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly entitlementsService: EntitlementsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * [SELF-SERVICE-1] Validate that user has OWNER accountRole for billing mutations.
   * Only OWNER (and role=USER, not ADMIN impersonating) can create checkout/portal sessions.
   */
  private validateOwnerAccess(user: any): void {
    // Check if this is an impersonation token (read-only, cannot mutate)
    if (user.impersonation) {
      throw new ForbiddenException('Impersonation mode is read-only');
    }

    // [SELF-SERVICE-1] Only accountRole=OWNER can perform billing mutations
    if (user.accountRole !== 'OWNER') {
      throw new ForbiddenException('Only account owners can manage billing');
    }
  }

  /**
   * [SELF-SERVICE-1] Check if legacy billing endpoints are allowed.
   * In non-test environments, these should be blocked for customers.
   */
  private isLegacyEndpointAllowed(user: any): boolean {
    const nodeEnv = this.configService.get<string>('NODE_ENV');

    // Allow in test environments
    if (nodeEnv === 'test') {
      return true;
    }

    // Allow for internal admins (role=ADMIN with adminRole)
    if (user.role === 'ADMIN' && user.adminRole) {
      return true;
    }

    // Block for regular customers in non-test environments
    return false;
  }

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
   * Returns plan, status, limits and usage for the current user.
   */
  @Get('summary')
  @UseGuards(JwtAuthGuard)
  async getSummary(@Request() req: any) {
    return this.billingService.getBillingSummary(req.user.id);
  }

  /**
   * Create a Stripe Checkout session for upgrading
   * [SELF-SERVICE-1] Only accountRole=OWNER can create checkout sessions
   */
  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @Request() req: any,
    @Body() body: { planId: PlanId },
  ) {
    this.validateOwnerAccess(req.user);
    return this.billingService.createCheckoutSession(req.user.id, body.planId);
  }

  /**
   * Create a Stripe Billing Portal session for managing subscription
   * [SELF-SERVICE-1] Only accountRole=OWNER can access billing portal
   */
  @Post('create-portal-session')
  @UseGuards(JwtAuthGuard)
  async createPortalSession(@Request() req: any) {
    this.validateOwnerAccess(req.user);
    return this.billingService.createPortalSession(req.user.id);
  }

  /**
   * Update subscription to a new plan (legacy/admin)
   * [SELF-SERVICE-1] Locked down - internal-only (ADMIN-OPS roles) or test environments.
   * Customers must use Stripe Checkout/Portal.
   * See SELF_SERVICE.md for details.
   */
  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  async subscribe(@Request() req: any, @Body() body: { planId: string }) {
    if (!this.isLegacyEndpointAllowed(req.user)) {
      throw new ForbiddenException(
        'Direct subscription changes are not available. Please use the billing portal.'
      );
    }
    return this.billingService.updateSubscription(req.user.id, body.planId);
  }

  /**
   * Cancel subscription (legacy - use portal instead)
   * [SELF-SERVICE-1] Locked down - internal-only (ADMIN-OPS roles) or test environments.
   * Customers must use Stripe Portal.
   * See SELF_SERVICE.md for details.
   */
  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(@Request() req: any) {
    if (!this.isLegacyEndpointAllowed(req.user)) {
      throw new ForbiddenException(
        'Direct subscription cancellation is not available. Please use the billing portal.'
      );
    }
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
