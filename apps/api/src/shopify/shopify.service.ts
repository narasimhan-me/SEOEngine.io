import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { IntegrationType } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class ShopifyService {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly appUrl: string;
  private readonly scopes: string;
  private readonly stateStore = new Map<string, string>(); // In production, use Redis

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.get<string>('SHOPIFY_API_KEY');
    this.apiSecret = this.config.get<string>('SHOPIFY_API_SECRET');
    this.appUrl = this.config.get<string>('SHOPIFY_APP_URL');
    this.scopes = this.config.get<string>('SHOPIFY_SCOPES', 'read_products,write_products,read_themes');
  }

  /**
   * Generate the Shopify OAuth URL for installation
   */
  generateInstallUrl(shop: string, projectId: string): string {
    const state = crypto.randomBytes(16).toString('hex');
    this.stateStore.set(state, projectId);

    const redirectUri = `${this.appUrl}/shopify/callback`;
    const params = new URLSearchParams({
      client_id: this.apiKey,
      scope: this.scopes,
      redirect_uri: redirectUri,
      state,
    });

    return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
  }

  /**
   * Validate HMAC from Shopify callback
   */
  validateHmac(query: Record<string, any>): boolean {
    const { hmac, ...params } = query;

    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    const hash = crypto
      .createHmac('sha256', this.apiSecret)
      .update(sortedParams)
      .digest('hex');

    return hash === hmac;
  }

  /**
   * Validate state parameter and retrieve projectId
   */
  validateState(state: string): string | null {
    const projectId = this.stateStore.get(state);
    if (projectId) {
      this.stateStore.delete(state);
      return projectId;
    }
    return null;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeToken(shop: string, code: string): Promise<{ access_token: string; scope: string }> {
    const url = `https://${shop}/admin/oauth/access_token`;
    const body = {
      client_id: this.apiKey,
      client_secret: this.apiSecret,
      code,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new BadRequestException('Failed to exchange token with Shopify');
    }

    return response.json() as Promise<{ access_token: string; scope: string }>;
  }

  /**
   * Persist Shopify integration in database
   */
  async storeShopifyConnection(
    projectId: string,
    shopDomain: string,
    accessToken: string,
    scope: string,
  ) {
    return this.prisma.integration.upsert({
      where: {
        projectId_type: {
          projectId,
          type: IntegrationType.SHOPIFY,
        },
      },
      create: {
        projectId,
        type: IntegrationType.SHOPIFY,
        externalId: shopDomain,
        accessToken,
        config: {
          scope,
          installedAt: new Date().toISOString(),
        },
      },
      update: {
        externalId: shopDomain,
        accessToken,
        config: {
          scope,
          installedAt: new Date().toISOString(),
          uninstalledAt: null,
        },
      },
    });
  }

  /**
   * Get Shopify integration by projectId
   */
  async getShopifyIntegration(projectId: string) {
    return this.prisma.integration.findUnique({
      where: {
        projectId_type: {
          projectId,
          type: IntegrationType.SHOPIFY,
        },
      },
    });
  }

  /**
   * Check project ownership
   */
  async validateProjectOwnership(projectId: string, userId: string): Promise<boolean> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });
    return !!project;
  }

  /**
   * Sync products from Shopify store to local database
   */
  async syncProducts(projectId: string, userId: string): Promise<{
    projectId: string;
    synced: number;
    created: number;
    updated: number;
  }> {
    // Validate ownership
    const isOwner = await this.validateProjectOwnership(projectId, userId);
    if (!isOwner) {
      throw new BadRequestException('You do not have access to this project');
    }

    // Get Shopify integration
    const integration = await this.getShopifyIntegration(projectId);
    if (!integration || !integration.accessToken || !integration.externalId) {
      throw new BadRequestException('No Shopify integration found for this project');
    }

    const shopDomain = integration.externalId;
    const accessToken = integration.accessToken;

    // Fetch products from Shopify Admin API
    const products = await this.fetchShopifyProducts(shopDomain, accessToken);

    let created = 0;
    let updated = 0;

    // Upsert each product
    for (const product of products) {
      const externalId = String(product.id);
      const existingProduct = await this.prisma.product.findFirst({
        where: {
          projectId,
          externalId,
        },
      });

      // Note: Shopify's seo.title/description are only set if merchant explicitly customized them.
      // If not set, we fall back to product title (Shopify's default behavior).
      // We store null for seoDescription if not set, so user knows to add one.
      const productData = {
        title: product.title,
        description: product.body_html || null,
        seoTitle: product.metafields_global_title_tag || product.title || null,
        seoDescription: product.metafields_global_description_tag || null,
        imageUrls: product.images?.map((img: { src: string }) => img.src) || [],
        lastSyncedAt: new Date(),
      };

      if (existingProduct) {
        await this.prisma.product.update({
          where: { id: existingProduct.id },
          data: productData,
        });
        updated++;
      } else {
        await this.prisma.product.create({
          data: {
            projectId,
            externalId,
            ...productData,
          },
        });
        created++;
      }
    }

    return {
      projectId,
      synced: products.length,
      created,
      updated,
    };
  }

  /**
   * Fetch products from Shopify Admin GraphQL API
   * Uses GraphQL to retrieve SEO metafields which aren't returned by REST API
   */
  private async fetchShopifyProducts(
    shopDomain: string,
    accessToken: string,
  ): Promise<ShopifyProduct[]> {
    const url = `https://${shopDomain}/admin/api/2024-01/graphql.json`;

    const query = `
      query GetProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              descriptionHtml
              seo {
                title
                description
              }
              images(first: 10) {
                edges {
                  node {
                    url
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { first: 50 },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shopify GraphQL API error:', errorText);
      throw new BadRequestException('Failed to fetch products from Shopify');
    }

    const data = await response.json() as {
      data?: {
        products?: {
          edges: Array<{
            node: {
              id: string;
              title: string;
              handle?: string;
              descriptionHtml?: string;
              seo?: {
                title?: string;
                description?: string;
              };
              images?: {
                edges: Array<{
                  node: { url: string };
                }>;
              };
            };
          }>;
        };
      };
      errors?: Array<{ message: string }>;
    };

    if (data.errors) {
      console.error('Shopify GraphQL errors:', data.errors);
      throw new BadRequestException('Failed to fetch products from Shopify');
    }

    const edges = data.data?.products?.edges || [];

    // Log the first product's SEO data for debugging
    if (edges.length > 0) {
      const firstNode = edges[0].node;
      console.log('[Shopify Sync] Sample product SEO data:', {
        title: firstNode.title,
        seo: firstNode.seo,
        hasSeoTitle: !!firstNode.seo?.title,
        hasSeoDescription: !!firstNode.seo?.description,
      });
    }

    // Transform GraphQL response to our ShopifyProduct interface
    return edges.map((edge) => {
      const node = edge.node;
      // Extract numeric ID from GraphQL ID (e.g., "gid://shopify/Product/123" -> 123)
      const numericId = parseInt(node.id.split('/').pop() || '0', 10);

      const product = {
        id: numericId,
        title: node.title,
        handle: node.handle,
        body_html: node.descriptionHtml,
        metafields_global_title_tag: node.seo?.title || undefined,
        metafields_global_description_tag: node.seo?.description || undefined,
        images: node.images?.edges.map((imgEdge) => ({ src: imgEdge.node.url })),
      };

      return product;
    });
  }

  /**
   * Fetch a single product from Shopify to get its handle
   */
  async fetchShopifyProduct(
    shopDomain: string,
    accessToken: string,
    productId: string,
  ): Promise<ShopifyProduct | null> {
    const url = `https://${shopDomain}/admin/api/2023-10/products/${productId}.json`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Shopify API error fetching product:', await response.text());
      return null;
    }

    const data = (await response.json()) as { product: ShopifyProduct };
    return data.product || null;
  }

  /**
   * Update product SEO fields in Shopify and local database
   */
  async updateProductSeo(
    productId: string,
    seoTitle: string,
    seoDescription: string,
    userId: string,
  ): Promise<{
    productId: string;
    shopDomain: string;
    seoTitle: string;
    seoDescription: string;
  }> {
    // Load product with project
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        project: true,
      },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // Validate ownership
    if (product.project.userId !== userId) {
      throw new BadRequestException('You do not have access to this product');
    }

    // Get Shopify integration
    const integration = await this.getShopifyIntegration(product.projectId);
    if (!integration || !integration.accessToken || !integration.externalId) {
      throw new BadRequestException('No Shopify integration found for this project');
    }

    const shopDomain = integration.externalId;
    const accessToken = integration.accessToken;

    // Update SEO in Shopify using metafields
    await this.updateShopifyProductSeo(
      shopDomain,
      accessToken,
      product.externalId,
      seoTitle,
      seoDescription,
    );

    // Update local Product record
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        seoTitle,
        seoDescription,
        lastSyncedAt: new Date(),
      },
    });

    return {
      productId,
      shopDomain,
      seoTitle,
      seoDescription,
    };
  }

  /**
   * Update SEO fields for a product in Shopify via Admin API
   * Uses metafields for SEO title and description
   */
  private async updateShopifyProductSeo(
    shopDomain: string,
    accessToken: string,
    externalProductId: string,
    seoTitle: string,
    seoDescription: string,
  ): Promise<void> {
    // Shopify REST API endpoint for updating a product
    const url = `https://${shopDomain}/admin/api/2023-10/products/${externalProductId}.json`;

    // Update product with metafields_global_title_tag and metafields_global_description_tag
    // These are Shopify's built-in SEO fields that appear in the product admin
    const body = {
      product: {
        id: externalProductId,
        metafields_global_title_tag: seoTitle,
        metafields_global_description_tag: seoDescription,
      },
    };

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shopify API error updating product SEO:', errorText);
      throw new BadRequestException('Failed to update product SEO in Shopify');
    }
  }
}

interface ShopifyProduct {
  id: number;
  title: string;
  body_html?: string;
  handle?: string;
  metafields_global_title_tag?: string;
  metafields_global_description_tag?: string;
  images?: Array<{ src: string }>;
}
