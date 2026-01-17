import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  UseGuards,
  Request,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ShopifyService } from './shopify.service';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('shopify')
export class ShopifyController {
  constructor(
    private readonly shopifyService: ShopifyService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * GET /shopify/install?shop=example.myshopify.com&projectId=xxx&token=jwt
   * Initiates Shopify OAuth flow
   * Note: Token is passed via query param since this is a browser redirect
   */
  @Get('install')
  async install(
    @Query('shop') shop: string,
    @Query('projectId') projectId: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    if (!shop || !projectId) {
      throw new BadRequestException('Missing shop or projectId parameter');
    }

    if (!token) {
      throw new UnauthorizedException('Authentication token required');
    }

    // Manually validate JWT since we're receiving it via query param
    let userId: string;
    try {
      const payload = this.jwtService.verify(token);
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const isOwner = await this.shopifyService.validateProjectOwnership(projectId, userId);
    if (!isOwner) {
      throw new UnauthorizedException('You do not own this project');
    }

    const installUrl = this.shopifyService.generateInstallUrl(shop, projectId);
    return res.redirect(installUrl);
  }

  /**
   * GET /shopify/reconnect?projectId=xxx&token=jwt&capability=pages_sync|collections_sync|blogs_sync&returnTo=/projects/...
   * Explicit, user-initiated Shopify OAuth re-consent flow for missing scopes.
   * Requests the minimal union of (currently granted scopes) + (missing required scopes for capability).
   */
  @Get('reconnect')
  async reconnect(
    @Query('projectId') projectId: string,
    @Query('token') token: string,
    @Query('capability') capability: string,
    @Query('returnTo') returnTo: string,
    @Res() res: Response,
  ) {
    if (!projectId) {
      throw new BadRequestException('Missing projectId parameter');
    }
    if (!capability) {
      throw new BadRequestException('Missing capability parameter');
    }
    if (!token) {
      throw new UnauthorizedException('Authentication token required');
    }
    const cap =
      capability === 'pages_sync' || capability === 'collections_sync' || capability === 'blogs_sync'
        ? capability
        : null;
    if (!cap) {
      throw new BadRequestException('Invalid capability parameter');
    }
    let userId: string;
    try {
      const payload = this.jwtService.verify(token);
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const isOwner = await this.shopifyService.validateProjectOwnership(projectId, userId);
    if (!isOwner) {
      throw new UnauthorizedException('You do not own this project');
    }
    const integration = await this.shopifyService.getShopifyIntegration(projectId);
    if (!integration || !integration.externalId) {
      throw new BadRequestException('No Shopify integration found for this project');
    }
    const scopeStatus = await this.shopifyService.getShopifyScopeStatus(projectId, cap);
    const desiredScopes = [...(scopeStatus.grantedScopes ?? [])];
    for (const scope of scopeStatus.missingScopes ?? []) {
      if (!desiredScopes.includes(scope)) desiredScopes.push(scope);
    }
    const safeReturnTo = this.shopifyService.getSafeReturnToForProject(returnTo, projectId);
    const installUrl = this.shopifyService.generateInstallUrl(integration.externalId, projectId, {
      scopesCsv: desiredScopes.join(','),
      source: 'reconnect',
      capability: cap,
      returnTo: safeReturnTo,
    });
    return res.redirect(installUrl);
  }

  /**
   * GET /shopify/callback
   * Shopify redirects here after user authorizes the app
   */
  @Get('callback')
  async callback(@Query() query: any, @Res() res: Response) {
    const { code, shop, state, hmac } = query;

    if (!code || !shop || !state || !hmac) {
      throw new BadRequestException('Missing required OAuth parameters');
    }

    // Validate HMAC
    const isValidHmac = this.shopifyService.validateHmac(query);
    if (!isValidHmac) {
      throw new UnauthorizedException('Invalid HMAC signature');
    }

    // Validate state and get payload
    const statePayload = this.shopifyService.validateState(state);
    if (!statePayload?.projectId) {
      throw new UnauthorizedException('Invalid or expired state parameter');
    }
    const projectId = statePayload.projectId;

    // Exchange code for access token
    const tokenData = await this.shopifyService.exchangeToken(shop, code);

    // [SHOPIFY-SCOPES-MATRIX-1] Log scope computation metadata for debugging
    console.log('[Shopify Callback] Token exchange result:', {
      projectId,
      shop,
      source: statePayload.source,
      capability: statePayload.capability,
      returnTo: statePayload.returnTo,
      scopeFromShopify: tokenData.scope,
      requiredScopes: statePayload.requiredScopes,
      requestedScopes: statePayload.requestedScopes,
    });

    // Store connection in database
    await this.shopifyService.storeShopifyConnection(
      projectId,
      shop,
      tokenData.access_token,
      tokenData.scope,
    );

    console.log('[Shopify Callback] Connection stored successfully');

    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const basePath = statePayload.returnTo ?? `/projects/${projectId}`;
    const redirectUrl = new URL(basePath, frontendUrl);
    if (statePayload.source === 'reconnect') {
      redirectUrl.searchParams.set('shopify', 'reconnected');
      if (statePayload.capability) {
        redirectUrl.searchParams.set('reconnect', statePayload.capability);
      }
    } else {
      redirectUrl.searchParams.set('shopify', 'connected');
    }
    return res.redirect(redirectUrl.toString());
  }

  /**
   * POST /shopify/sync-products?projectId=...
   * Sync products from Shopify store to local database
   */
  @Post('sync-products')
  @UseGuards(JwtAuthGuard)
  async syncProducts(@Request() req: any, @Query('projectId') projectId: string) {
    if (!projectId) {
      throw new BadRequestException('Missing projectId parameter');
    }
    return this.shopifyService.syncProducts(projectId, req.user.id);
  }

  /**
   * POST /shopify/update-product-seo
   * Update product SEO fields in Shopify
   */
  @Post('update-product-seo')
  @UseGuards(JwtAuthGuard)
  async updateProductSeo(
    @Request() req: any,
    @Body() body: { productId: string; seoTitle: string; seoDescription: string },
  ) {
    const { productId, seoTitle, seoDescription } = body;

    if (!productId || !seoTitle || !seoDescription) {
      throw new BadRequestException('Missing required fields: productId, seoTitle, seoDescription');
    }

    return this.shopifyService.updateProductSeo(productId, seoTitle, seoDescription, req.user.id);
  }

  /**
   * POST /shopify/ensure-metafield-definitions?projectId=...
   * Manually trigger creation of Answer Block metafield definitions in Shopify.
   * Use this for stores connected before AEO-2 metafields sync was deployed.
   */
  @Post('ensure-metafield-definitions')
  @UseGuards(JwtAuthGuard)
  async ensureMetafieldDefinitions(
    @Request() req: any,
    @Query('projectId') projectId: string,
  ) {
    if (!projectId) {
      throw new BadRequestException('Missing projectId parameter');
    }

    const isOwner = await this.shopifyService.validateProjectOwnership(
      projectId,
      req.user.id,
    );
    if (!isOwner) {
      throw new UnauthorizedException('You do not own this project');
    }

    return this.shopifyService.ensureMetafieldDefinitions(projectId);
  }
}
