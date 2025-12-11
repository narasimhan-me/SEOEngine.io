import { Injectable, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { IntegrationType } from '@prisma/client';
import * as crypto from 'crypto';
import { AutomationService } from '../projects/automation.service';

const ANSWER_BLOCK_METAFIELD_DEFINITIONS: {
  questionId: string;
  key: string;
  name: string;
  description: string;
}[] = [
  {
    questionId: 'what_is_it',
    key: 'answer_what_is_it',
    name: 'What is it?',
    description: 'Answer Engine: what is this product?',
  },
  {
    questionId: 'who_is_it_for',
    key: 'answer_usage',
    name: 'Who is it for?',
    description:
      'Answer Engine: who this product is for and primary usage context.',
  },
  {
    questionId: 'why_choose_this',
    key: 'answer_benefits',
    name: 'Why choose this?',
    description:
      'Answer Engine: core benefits and reasons to choose this product.',
  },
  {
    questionId: 'key_features',
    key: 'answer_key_features',
    name: 'Key features',
    description: 'Answer Engine: key features of this product.',
  },
  {
    questionId: 'how_is_it_used',
    key: 'answer_how_it_works',
    name: 'How it works / is used',
    description: 'Answer Engine: how this product works or is used.',
  },
  {
    questionId: 'problems_it_solves',
    key: 'answer_faq',
    name: 'Problems it solves / FAQ',
    description:
      'Answer Engine: common problems this product solves, framed as FAQs.',
  },
  {
    questionId: 'what_makes_it_different',
    key: 'answer_dimensions',
    name: 'What makes it different',
    description:
      'Answer Engine: what differentiates this product, including key dimensions or specs.',
  },
  {
    questionId: 'whats_included',
    key: 'answer_warranty',
    name: "What's included / warranty",
    description:
      'Answer Engine: what is included with the product and key warranty terms.',
  },
  {
    questionId: 'materials_and_specs',
    key: 'answer_materials',
    name: 'Materials and specs',
    description: 'Answer Engine: materials and key specifications.',
  },
  {
    questionId: 'care_safety_instructions',
    key: 'answer_care_instructions',
    name: 'Care and instructions',
    description:
      'Answer Engine: care, safety, and usage instructions for the product.',
  },
];

const ANSWER_BLOCK_METAFIELD_KEY_BY_QUESTION_ID: Record<string, string> =
  ANSWER_BLOCK_METAFIELD_DEFINITIONS.reduce((acc, def) => {
    acc[def.questionId] = def.key;
    return acc;
  }, {} as Record<string, string>);

export function mapAnswerBlocksToMetafieldPayloads(
  blocks: { questionId: string; answerText: string }[],
): {
  mappings: { key: string; value: string }[];
  skippedUnknownQuestionIds: string[];
} {
  const mappings: { key: string; value: string }[] = [];
  const skippedUnknownQuestionIds: string[] = [];
  for (const block of blocks) {
    const key = ANSWER_BLOCK_METAFIELD_KEY_BY_QUESTION_ID[block.questionId];
    if (!key) {
      skippedUnknownQuestionIds.push(block.questionId);
      continue;
    }
    const value = (block.answerText ?? '').trim();
    if (!value) {
      continue;
    }
    mappings.push({ key, value });
  }
  return { mappings, skippedUnknownQuestionIds };
}

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly appUrl: string;
  private readonly scopes: string;
  private readonly stateStore = new Map<string, string>(); // In production, use Redis

  private lastShopifyRequestAt = 0;
  private readonly minShopifyIntervalMs = 500;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => AutomationService))
    private readonly automationService: AutomationService,
  ) {
    this.apiKey = this.config.get<string>('SHOPIFY_API_KEY');
    this.apiSecret = this.config.get<string>('SHOPIFY_API_SECRET');
    this.appUrl = this.config.get<string>('SHOPIFY_APP_URL');
    this.scopes = this.config.get<string>('SHOPIFY_SCOPES', 'read_products,write_products,read_themes');
  }

  private get isTestEnv(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  private async rateLimitedFetch(url: string, init: any): Promise<any> {
    if (!this.isTestEnv && this.lastShopifyRequestAt > 0) {
      const elapsed = Date.now() - this.lastShopifyRequestAt;
      if (elapsed < this.minShopifyIntervalMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.minShopifyIntervalMs - elapsed),
        );
      }
    }
    this.lastShopifyRequestAt = Date.now();
    return fetch(url, init);
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

    const response = await this.rateLimitedFetch(url, {
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
    const integration = await this.prisma.integration.upsert({
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

    // Fire-and-forget ensure of Answer Block metafield definitions for this store.
    this.ensureMetafieldDefinitions(projectId).catch((err) => {
      this.logger.warn(
        `[ShopifyMetafields] Failed to ensure metafield definitions for project ${projectId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    });

    return integration;
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
   * Ensure metafield definitions for Answer Blocks exist for this project/store.
   * Uses Shopify Admin API metafield_definitions endpoint (namespace: engineo, owner_type: product).
   */
  private async ensureMetafieldDefinitionsForStore(
    projectId: string,
    shopDomain: string,
    accessToken: string,
  ): Promise<{ created: number; existing: number; errors: string[] }> {
    const listUrl = `https://${shopDomain}/admin/api/2023-10/metafield_definitions.json?namespace=engineo&owner_type=product`;
    const listResponse = await this.rateLimitedFetch(listUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      this.logger.warn(
        `[ShopifyMetafields] Failed to list metafield definitions for project ${projectId} (${shopDomain}): ${errorText}`,
      );
      return { created: 0, existing: 0, errors: ['metafield_definitions_list_failed'] };
    }

    const payload = (await listResponse.json()) as {
      metafield_definitions?: Array<{
        id: number;
        namespace: string;
        key: string;
        owner_type?: string;
      }>;
    };

    const existingKeys = new Set(
      (payload.metafield_definitions ?? [])
        .filter(
          (def) =>
            def.namespace === 'engineo' &&
            (def.owner_type === 'product' || !def.owner_type),
        )
        .map((def) => def.key),
    );

    let created = 0;
    let existing = 0;
    const errors: string[] = [];

    for (const def of ANSWER_BLOCK_METAFIELD_DEFINITIONS) {
      if (existingKeys.has(def.key)) {
        existing++;
        continue;
      }

      const createBody = {
        metafield_definition: {
          namespace: 'engineo',
          key: def.key,
          name: def.name,
          description: def.description,
          type: 'multi_line_text_field',
          owner_type: 'product',
        },
      };

      const createUrl = `https://${shopDomain}/admin/api/2023-10/metafield_definitions.json`;
      const createResponse = await this.rateLimitedFetch(createUrl, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createBody),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        this.logger.warn(
          `[ShopifyMetafields] Failed to create metafield definition ${def.key} for project ${projectId}: ${errorText}`,
        );
        errors.push(`definition:${def.key}`);
        continue;
      }

      created++;
    }

    return { created, existing, errors };
  }

  async ensureMetafieldDefinitions(projectId: string): Promise<{
    projectId: string;
    created: number;
    existing: number;
    errors: string[];
  }> {
    const integration = await this.getShopifyIntegration(projectId);
    if (!integration || !integration.accessToken || !integration.externalId) {
      this.logger.warn(
        `[ShopifyMetafields] No Shopify integration found for project ${projectId}; skipping metafield definition ensure.`,
      );
      return {
        projectId,
        created: 0,
        existing: 0,
        errors: ['no_shopify_integration'],
      };
    }

    const result = await this.ensureMetafieldDefinitionsForStore(
      projectId,
      integration.externalId,
      integration.accessToken,
    );

    return {
      projectId,
      created: result.created,
      existing: result.existing,
      errors: result.errors,
    };
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
   * Sync persisted Answer Blocks for a product to Shopify metafields.
   * Respects the engineo namespace and Answer Block → metafield key mapping.
   */
  async syncAnswerBlocksToShopify(
    productId: string,
  ): Promise<AnswerBlockMetafieldSyncResult> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        project: true,
      },
    });

    if (!product) {
      this.logger.warn(
        `[ShopifyMetafields] Product ${productId} not found; skipping metafield sync.`,
      );
      return {
        productId,
        shopDomain: null,
        syncedCount: 0,
        skippedUnknownQuestionIds: [],
        errors: ['product_not_found'],
        skippedReason: 'product_not_found',
      };
    }

    const integration = await this.getShopifyIntegration(product.projectId);
    if (!integration || !integration.accessToken || !integration.externalId) {
      this.logger.warn(
        `[ShopifyMetafields] No Shopify integration for project ${product.projectId}; skipping metafield sync for product ${productId}.`,
      );
      return {
        productId,
        shopDomain: null,
        syncedCount: 0,
        skippedUnknownQuestionIds: [],
        errors: ['no_shopify_integration'],
        skippedReason: 'no_shopify_integration',
      };
    }

    const shopDomain = integration.externalId;
    const accessToken = integration.accessToken;
    const externalProductId = product.externalId;

    const answerBlocks = await this.prisma.answerBlock.findMany({
      where: { productId },
      orderBy: { questionId: 'asc' },
    });

    if (!answerBlocks.length) {
      this.logger.log(
        `[ShopifyMetafields] No Answer Blocks to sync for product ${productId}.`,
      );
      return {
        productId,
        shopDomain,
        syncedCount: 0,
        skippedUnknownQuestionIds: [],
        errors: [],
        skippedReason: 'no_answer_blocks',
      };
    }

    // Ensure metafield definitions exist for this project/store
    await this.ensureMetafieldDefinitions(product.projectId);

    const listUrl = `https://${shopDomain}/admin/api/2023-10/products/${externalProductId}/metafields.json?namespace=engineo`;
    const listResponse = await this.rateLimitedFetch(listUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      this.logger.warn(
        `[ShopifyMetafields] Failed to list metafields for product ${externalProductId} (${shopDomain}): ${errorText}`,
      );
      return {
        productId,
        shopDomain,
        syncedCount: 0,
        skippedUnknownQuestionIds: [],
        errors: ['metafields_fetch_failed'],
        skippedReason: 'metafields_fetch_failed',
      };
    }

    const existingPayload = (await listResponse.json()) as {
      metafields?: Array<{ id: number; key: string; namespace: string }>;
    };

    const existingByKey = new Map<string, { id: number }>();
    for (const mf of existingPayload.metafields ?? []) {
      if (mf.namespace === 'engineo') {
        existingByKey.set(mf.key, { id: mf.id });
      }
    }

    const { mappings, skippedUnknownQuestionIds } = mapAnswerBlocksToMetafieldPayloads(
      answerBlocks.map((block: any) => ({
        questionId: block.questionId,
        answerText: block.answerText,
      })),
    );

    let syncedCount = 0;
    const errors: string[] = [];

    for (const mapping of mappings) {
      const existing = existingByKey.get(mapping.key);
      try {
        if (existing) {
          const updateUrl = `https://${shopDomain}/admin/api/2023-10/metafields/${existing.id}.json`;
          const updateBody = {
            metafield: {
              id: existing.id,
              type: 'multi_line_text_field',
              value: mapping.value,
            },
          };
          const updateResponse = await this.rateLimitedFetch(updateUrl, {
            method: 'PUT',
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateBody),
          });
          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            this.logger.warn(
              `[ShopifyMetafields] Failed to update metafield ${mapping.key} for product ${externalProductId}: ${errorText}`,
            );
            errors.push(`update:${mapping.key}`);
            continue;
          }
        } else {
          const createUrl = `https://${shopDomain}/admin/api/2023-10/products/${externalProductId}/metafields.json`;
          const createBody = {
            metafield: {
              namespace: 'engineo',
              key: mapping.key,
              type: 'multi_line_text_field',
              value: mapping.value,
            },
          };
          const createResponse = await this.rateLimitedFetch(createUrl, {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(createBody),
          });
          if (!createResponse.ok) {
            const errorText = await createResponse.text();
            this.logger.warn(
              `[ShopifyMetafields] Failed to create metafield ${mapping.key} for product ${externalProductId}: ${errorText}`,
            );
            errors.push(`create:${mapping.key}`);
            continue;
          }
        }
        syncedCount++;
      } catch (err) {
        this.logger.warn(
          `[ShopifyMetafields] Error syncing metafield ${mapping.key} for product ${externalProductId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        errors.push(`error:${mapping.key}`);
      }
    }

    return {
      productId,
      shopDomain,
      syncedCount,
      skippedUnknownQuestionIds,
      errors,
    };
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
        const newProduct = await this.prisma.product.create({
          data: {
            projectId,
            externalId,
            ...productData,
          },
        });
        created++;

        // Trigger automation for new products (non-blocking)
        // This runs AUTO_GENERATE_METADATA_ON_NEW_PRODUCT rule
        this.automationService
          .runNewProductSeoTitleAutomation(projectId, newProduct.id, userId)
          .catch((err) => {
            this.logger.warn(
              `[ShopifySync] Automation failed for new product ${newProduct.id}: ${err.message}`,
            );
          });

        // Trigger Answer Block automation for new products (non-blocking)
        this.automationService
          .triggerAnswerBlockAutomationForProduct(newProduct.id, userId, 'product_synced')
          .catch((err) => {
            this.logger.warn(
              `[ShopifySync] Answer Block automation failed for new product ${newProduct.id}: ${err.message}`,
            );
          });
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

    const response = await this.rateLimitedFetch(url, {
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

    const response = await this.rateLimitedFetch(url, {
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

    const response = await this.rateLimitedFetch(url, {
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

export interface AnswerBlockMetafieldSyncResult {
  productId: string;
  shopDomain: string | null;
  syncedCount: number;
  skippedUnknownQuestionIds: string[];
  errors: string[];
  skippedReason?:
    | 'product_not_found'
    | 'no_shopify_integration'
    | 'no_answer_blocks'
    | 'metafields_fetch_failed';
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
