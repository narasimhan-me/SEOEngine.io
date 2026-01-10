import { Injectable, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { IntegrationType } from '@prisma/client';
import * as crypto from 'crypto';
import { AutomationService } from '../projects/automation.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import { isE2EMode } from '../config/test-env-guard';

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

interface ShopifyGraphqlError {
  message: string;
}

interface ShopifyGraphqlEnvelope<T> {
  data?: T;
  errors?: ShopifyGraphqlError[];
}

/**
 * [ADMIN-OPS-1] Options for product sync.
 */
interface SyncProductsOptions {
  /**
   * When false, skips automation triggers for new products.
   * Used by admin resync to prevent AI side effects.
   * Default: true (triggers automation)
   */
  triggerAutomation?: boolean;
}

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
    private readonly roleResolution: RoleResolutionService,
  ) {
    this.apiKey = this.config.get<string>('SHOPIFY_API_KEY');
    this.apiSecret = this.config.get<string>('SHOPIFY_API_SECRET');
    this.appUrl = this.config.get<string>('SHOPIFY_APP_URL');
    this.scopes = this.config.get<string>('SHOPIFY_SCOPES', 'read_products,write_products,read_themes');
  }

  private get isTestEnv(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  /**
   * E2E-only Shopify mock: returns deterministic responses without network.
   * Covers the operations used in TEST-2 flows:
   * - UpdateProductSeo
   * - GetEngineoMetafieldDefinitions
   * - CreateEngineoMetafieldDefinition
   * - SetEngineoMetafields
   */
  private async e2eMockShopifyFetch(url: string, init: any): Promise<any> {
    try {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const operationName = body.operationName as string | undefined;

      if (operationName === 'UpdateProductSeo') {
        return {
          ok: true,
          json: async () => ({
            data: {
              productUpdate: {
                product: {
                  id: body.variables?.input?.id ?? 'gid://shopify/Product/0',
                  seo: {
                    title: body.variables?.input?.seo?.title ?? null,
                    description: body.variables?.input?.seo?.description ?? null,
                  },
                },
                userErrors: [],
              },
            },
          }),
          text: async () => '',
        };
      }

      if (operationName === 'GetEngineoMetafieldDefinitions') {
        return {
          ok: true,
          json: async () => ({
            data: {
              metafieldDefinitions: {
                edges: [],
              },
            },
          }),
          text: async () => '',
        };
      }

      if (operationName === 'CreateEngineoMetafieldDefinition') {
        const definition = body.variables?.definition;
        return {
          ok: true,
          json: async () => ({
            data: {
              metafieldDefinitionCreate: {
                createdDefinition: {
                  id: 'gid://shopify/MetafieldDefinition/1',
                  key: definition?.key,
                  namespace: definition?.namespace,
                },
                userErrors: [],
              },
            },
          }),
          text: async () => '',
        };
      }

      if (operationName === 'SetEngineoMetafields') {
        return {
          ok: true,
          json: async () => ({
            data: {
              metafieldsSet: {
                metafields: [],
                userErrors: [],
              },
            },
          }),
          text: async () => '',
        };
      }

      // Fallback: generic success envelope.
      return {
        ok: true,
        json: async () => ({ data: {} }),
        text: async () => '',
      };
    } catch {
      return {
        ok: true,
        json: async () => ({ data: {} }),
        text: async () => '',
      };
    }
  }

  private async rateLimitedFetch(url: string, init: any): Promise<any> {
    if (isE2EMode()) {
      // In E2E mode, never hit the real Shopify Admin API.
      return this.e2eMockShopifyFetch(url, init);
    }

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

  private async executeShopifyGraphql<T>(
    shopDomain: string,
    accessToken: string,
    params: { query: string; variables?: any; operationName?: string },
  ): Promise<T> {
    const url = `https://${shopDomain}/admin/api/2024-01/graphql.json`;
    const response = await this.rateLimitedFetch(url, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: params.query,
        variables: params.variables ?? {},
        operationName: params.operationName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(
        `[ShopifyGraphQL] HTTP error for operation ${
          params.operationName ?? 'unknown'
        }: ${errorText}`,
      );
      throw new BadRequestException('Failed to call Shopify GraphQL Admin API');
    }

    const json = (await response.json()) as ShopifyGraphqlEnvelope<T>;

    if (json.errors && json.errors.length) {
      this.logger.error(
        `[ShopifyGraphQL] GraphQL errors for operation ${
          params.operationName ?? 'unknown'
        }: ${JSON.stringify(json.errors)}`,
      );
      throw new BadRequestException('Failed to call Shopify GraphQL Admin API');
    }

    if (!json.data) {
      this.logger.error(
        `[ShopifyGraphQL] Missing data for operation ${
          params.operationName ?? 'unknown'
        }`,
      );
      throw new BadRequestException('Failed to call Shopify GraphQL Admin API');
    }

    return json.data;
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
   * Uses Shopify GraphQL Admin API for metafield definitions (namespace: engineo, owner_type: PRODUCT).
   */
  private async ensureMetafieldDefinitionsForStore(
    projectId: string,
    shopDomain: string,
    accessToken: string,
  ): Promise<{ created: number; existing: number; errors: string[] }> {
    const query = `
      query GetEngineoMetafieldDefinitions(
        $ownerType: MetafieldOwnerType!
        $namespace: String!
        $first: Int!
      ) {
        metafieldDefinitions(ownerType: $ownerType, namespace: $namespace, first: $first) {
          edges {
            node {
              id
              key
              namespace
            }
          }
        }
      }
    `;

    let existingKeys: Set<string>;
    try {
      const data = await this.executeShopifyGraphql<{
        metafieldDefinitions: {
          edges: Array<{
            node: {
              id: string;
              key: string;
              namespace: string;
            };
          }>;
        };
      }>(shopDomain, accessToken, {
        query,
        variables: {
          ownerType: 'PRODUCT',
          namespace: 'engineo',
          first: 50,
        },
        operationName: 'GetEngineoMetafieldDefinitions',
      });

      existingKeys = new Set(
        (data.metafieldDefinitions?.edges ?? []).map((edge) => edge.node.key),
      );
    } catch (err) {
      this.logger.warn(
        `[ShopifyMetafields] Failed to list metafield definitions for project ${projectId} (${shopDomain}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return { created: 0, existing: 0, errors: ['metafield_definitions_list_failed'] };
    }

    let created = 0;
    let existing = 0;
    const errors: string[] = [];

    for (const def of ANSWER_BLOCK_METAFIELD_DEFINITIONS) {
      if (existingKeys.has(def.key)) {
        existing++;
        continue;
      }

      const mutation = `
        mutation CreateEngineoMetafieldDefinition($definition: MetafieldDefinitionInput!) {
          metafieldDefinitionCreate(definition: $definition) {
            createdDefinition {
              id
              key
              namespace
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const definitionInput = {
        name: def.name,
        namespace: 'engineo',
        key: def.key,
        type: 'multi_line_text_field',
        ownerType: 'PRODUCT',
        description: def.description,
      };

      try {
        const result = await this.executeShopifyGraphql<{
          metafieldDefinitionCreate: {
            createdDefinition: {
              id: string;
              key: string;
              namespace: string;
            } | null;
            userErrors: Array<{ field?: string[] | null; message: string }>;
          };
        }>(shopDomain, accessToken, {
          query: mutation,
          variables: { definition: definitionInput },
          operationName: 'CreateEngineoMetafieldDefinition',
        });

        const userErrors = result.metafieldDefinitionCreate.userErrors ?? [];
        if (userErrors.length > 0) {
          this.logger.warn(
            `[ShopifyMetafields] Failed to create metafield definition ${def.key} for project ${projectId}: ${userErrors
              .map((e) => e.message)
              .join('; ')}`,
          );
          errors.push(`definition:${def.key}`);
          continue;
        }
        created++;
      } catch (error) {
        this.logger.warn(
          `[ShopifyMetafields] Error creating metafield definition ${def.key} for project ${projectId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        errors.push(`definition:${def.key}`);
      }
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
   * Upsert metafields using GraphQL metafieldsSet mutation.
   */
  private async upsertMetafields(
    shopDomain: string,
    accessToken: string,
    metafields: Array<{
      ownerId: string;
      namespace: string;
      key: string;
      type: string;
      value: string;
    }>,
  ): Promise<string[]> {
    if (!metafields.length) {
      return [];
    }

    const mutation = `
      mutation SetEngineoMetafields($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const data = await this.executeShopifyGraphql<{
      metafieldsSet: {
        metafields: Array<{ id: string; namespace: string; key: string }>;
        userErrors: Array<{ field?: string[] | null; message: string }>;
      };
    }>(shopDomain, accessToken, {
      query: mutation,
      variables: { metafields },
      operationName: 'SetEngineoMetafields',
    });

    const userErrors = data.metafieldsSet?.userErrors ?? [];
    if (!userErrors.length) {
      return [];
    }

    return userErrors.map((e) => e.message);
  }

  /**
   * Check project ownership (OWNER role required).
   * [ROLES-3 FIXUP-5] Uses RoleResolutionService as source of truth.
   * Supports co-owners (any ProjectMember with OWNER role), not just legacy Project.userId.
   */
  async validateProjectOwnership(projectId: string, userId: string): Promise<boolean> {
    try {
      const role = await this.roleResolution.resolveEffectiveRole(projectId, userId);
      return role === 'OWNER';
    } catch {
      // User is not a project member at all
      return false;
    }
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

    const ownerId = `gid://shopify/Product/${externalProductId}`;

    const { mappings, skippedUnknownQuestionIds } = mapAnswerBlocksToMetafieldPayloads(
      answerBlocks.map((block: any) => ({
        questionId: block.questionId,
        answerText: block.answerText,
      })),
    );

    if (!mappings.length) {
      this.logger.log(
        `[ShopifyMetafields] No mapped Answer Blocks to sync for product ${productId}.`,
      );
      return {
        productId,
        shopDomain,
        syncedCount: 0,
        skippedUnknownQuestionIds,
        errors: [],
      };
    }

    const metafieldsInput = mappings.map((mapping) => ({
      ownerId,
      namespace: 'engineo',
      key: mapping.key,
      type: 'multi_line_text_field',
      value: mapping.value,
    }));

    const metafieldErrors = await this.upsertMetafields(
      shopDomain,
      accessToken,
      metafieldsInput,
    );

    const errors: string[] = metafieldErrors.map(
      (message) => `metafieldsSet:${message}`,
    );

    const syncedCount =
      metafieldsInput.length && !errors.length ? metafieldsInput.length : 0;

    return {
      productId,
      shopDomain,
      syncedCount,
      skippedUnknownQuestionIds,
      errors,
    };
  }

  /**
   * Sync products from Shopify store to local database.
   * [ADMIN-OPS-1] Accepts options.triggerAutomation (default true) to control automation triggers.
   */
  async syncProducts(
    projectId: string,
    userId: string,
    options: SyncProductsOptions = {},
  ): Promise<{
    projectId: string;
    synced: number;
    created: number;
    updated: number;
  }> {
    const { triggerAutomation = true } = options;
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
        handle: product.handle || null, // [LIST-SEARCH-FILTER-1] Persist Shopify handle
        seoTitle: product.metafields_global_title_tag || product.title || null,
        seoDescription: product.metafields_global_description_tag || null,
        imageUrls: product.images?.map((img) => img.src) || [],
        lastSyncedAt: new Date(),
      };

      let dbProductId: string;

      if (existingProduct) {
        await this.prisma.product.update({
          where: { id: existingProduct.id },
          data: productData,
        });
        dbProductId = existingProduct.id;
        updated++;
      } else {
        const newProduct = await this.prisma.product.create({
          data: {
            projectId,
            externalId,
            ...productData,
          },
        });
        dbProductId = newProduct.id;
        created++;

        // [ADMIN-OPS-1] Only trigger automation if triggerAutomation is true
        // Admin resync passes triggerAutomation=false to prevent AI side effects
        if (triggerAutomation) {
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

      // MEDIA-1: Upsert ProductImage records for image alt text sync
      await this.syncProductImages(dbProductId, product.images || []);
    }

    return {
      projectId,
      synced: products.length,
      created,
      updated,
    };
  }

  /**
   * Fetch products from Shopify Admin GraphQL API (paginated)
   * Uses GraphQL to retrieve SEO metafields which aren't returned by REST API
   */
  private async fetchShopifyProducts(
    shopDomain: string,
    accessToken: string,
  ): Promise<ShopifyProduct[]> {
    const query = `
      query GetProducts($first: Int!, $after: String) {
        products(first: $first, after: $after, sortKey: ID) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              handle
              descriptionHtml
              status
              productType
              vendor
              seo {
                title
                description
              }
              images(first: 10) {
                edges {
                  node {
                    id
                    altText
                    url
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price
                  }
                }
              }
            }
          }
        }
      }
    `;

    const allProducts: ShopifyProduct[] = [];
    let after: string | null = null;
    const pageSize = 50;
    let loggedSample = false;

    do {
      const data = await this.executeShopifyGraphql<{
        products: {
          pageInfo: {
            hasNextPage: boolean;
            endCursor: string | null;
          };
          edges: Array<{
            node: {
              id: string;
              title: string;
              handle?: string | null;
              descriptionHtml?: string | null;
              status?: string | null;
              productType?: string | null;
              vendor?: string | null;
              seo?: {
                title?: string | null;
                description?: string | null;
              } | null;
              images?: {
                edges: Array<{
                  node: {
                    id: string;
                    altText?: string | null;
                    url: string;
                  };
                }>;
              } | null;
              variants?: {
                edges: Array<{
                  node: {
                    id: string;
                    title?: string | null;
                    price?: string | null;
                  };
                }>;
              } | null;
            };
          }>;
        };
      }>(shopDomain, accessToken, {
        query,
        variables: {
          first: pageSize,
          after,
        },
        operationName: 'GetProducts',
      });

      const edges = data.products?.edges ?? [];

      if (!loggedSample && edges.length > 0) {
        const firstNode = edges[0].node;
        console.log('[Shopify Sync] Sample product SEO data:', {
          title: firstNode.title,
          seo: firstNode.seo,
          hasSeoTitle: !!firstNode.seo?.title,
          hasSeoDescription: !!firstNode.seo?.description,
        });
        loggedSample = true;
      }

      for (const edge of edges) {
        const node = edge.node;
        const numericId = parseInt(node.id.split('/').pop() || '0', 10);
        const product: ShopifyProduct = {
          id: numericId,
          title: node.title,
          handle: node.handle ?? undefined,
          body_html: node.descriptionHtml ?? undefined,
          metafields_global_title_tag: node.seo?.title || undefined,
          metafields_global_description_tag: node.seo?.description || undefined,
          // MEDIA-1: Preserve image ID, src, altText, and position for ProductImage sync
          images: node.images?.edges.map((imgEdge, index) => ({
            id: imgEdge.node.id,
            src: imgEdge.node.url,
            altText: imgEdge.node.altText ?? null,
            position: index,
          })) ?? [],
          status: node.status ?? undefined,
          productType: node.productType ?? undefined,
          vendor: node.vendor ?? undefined,
        };
        allProducts.push(product);
      }

      const pageInfo = data.products?.pageInfo;
      after =
        pageInfo && pageInfo.hasNextPage ? pageInfo.endCursor ?? null : null;
    } while (after);

    return allProducts;
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
   * [ROLES-3 FIXUP-4] OWNER-only for apply/mutation operations
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

    // [ROLES-3 FIXUP-4] OWNER-only for apply/mutation operations
    await this.roleResolution.assertOwnerRole(product.projectId, userId);

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
   * MEDIA-1: Sync ProductImage records from Shopify image data.
   * Upserts images and removes any that no longer exist in Shopify.
   */
  private async syncProductImages(
    productId: string,
    images: ShopifyProductImage[],
  ): Promise<void> {
    // Get current external IDs from the incoming images
    const incomingExternalIds = new Set<string>();

    for (const img of images) {
      // Extract numeric ID from GID (e.g., "gid://shopify/ProductImage/123" -> "123")
      const externalId = img.id.includes('/')
        ? img.id.split('/').pop() || img.id
        : img.id;

      incomingExternalIds.add(externalId);

      // Upsert the ProductImage record
      await this.prisma.productImage.upsert({
        where: {
          productId_externalId: {
            productId,
            externalId,
          },
        },
        create: {
          productId,
          externalId,
          src: img.src,
          altText: img.altText ?? null,
          position: img.position ?? null,
        },
        update: {
          src: img.src,
          altText: img.altText ?? null,
          position: img.position ?? null,
        },
      });
    }

    // Remove any ProductImage rows whose externalId no longer appears in the latest Shopify data
    if (incomingExternalIds.size > 0) {
      await this.prisma.productImage.deleteMany({
        where: {
          productId,
          externalId: {
            notIn: Array.from(incomingExternalIds),
          },
        },
      });
    } else {
      // If no images from Shopify, remove all ProductImage rows for this product
      await this.prisma.productImage.deleteMany({
        where: { productId },
      });
    }
  }

  /**
   * Update SEO fields for a product in Shopify via GraphQL Admin API
   * Uses productUpdate mutation to set seo.title and seo.description
   */
  private async updateShopifyProductSeo(
    shopDomain: string,
    accessToken: string,
    externalProductId: string,
    seoTitle: string,
    seoDescription: string,
  ): Promise<void> {
    const mutation = `
      mutation UpdateProductSeo($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            seo {
              title
              description
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const input = {
      id: `gid://shopify/Product/${externalProductId}`,
      seo: {
        title: seoTitle,
        description: seoDescription,
      },
    };

    const data = await this.executeShopifyGraphql<{
      productUpdate: {
        product: {
          id: string;
          seo?: {
            title?: string | null;
            description?: string | null;
          };
        } | null;
        userErrors: Array<{ field?: string[] | null; message: string }>;
      } | null;
    }>(shopDomain, accessToken, {
      query: mutation,
      variables: { input },
      operationName: 'UpdateProductSeo',
    });

    const userErrors = data.productUpdate?.userErrors ?? [];
    if (userErrors.length > 0) {
      this.logger.warn(
        `[ShopifyGraphQL] productUpdate returned errors: ${userErrors
          .map((e) => e.message)
          .join('; ')}`,
      );
      throw new BadRequestException('Failed to update product SEO in Shopify');
    }
  }

  // ===========================================================================
  // [ASSETS-PAGES-1.1] Page and Collection SEO Updates
  // ===========================================================================

  /**
   * [ASSETS-PAGES-1.1] Update Page SEO in Shopify.
   * Uses the pageUpdate mutation with seo field.
   *
   * @param shopDomain - The Shopify shop domain
   * @param accessToken - The Shopify access token
   * @param pageHandle - The page handle (from URL path /pages/{handle})
   * @param seoTitle - The new SEO title
   * @param seoDescription - The new SEO description
   */
  private async updateShopifyPageSeo(
    shopDomain: string,
    accessToken: string,
    pageHandle: string,
    seoTitle: string,
    seoDescription: string,
  ): Promise<{ pageId: string }> {
    // First, look up the page by handle to get its ID
    const lookupQuery = `
      query GetPageByHandle($handle: String!) {
        pageByHandle(handle: $handle) {
          id
        }
      }
    `;

    const lookupData = await this.executeShopifyGraphql<{
      pageByHandle: { id: string } | null;
    }>(shopDomain, accessToken, {
      query: lookupQuery,
      variables: { handle: pageHandle },
      operationName: 'GetPageByHandle',
    });

    if (!lookupData.pageByHandle) {
      throw new BadRequestException(`Page not found with handle: ${pageHandle}`);
    }

    const pageId = lookupData.pageByHandle.id;

    // Now update the page SEO
    const mutation = `
      mutation UpdatePageSeo($id: ID!, $page: PageUpdateInput!) {
        pageUpdate(id: $id, page: $page) {
          page {
            id
            handle
            seo {
              title
              description
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const data = await this.executeShopifyGraphql<{
      pageUpdate: {
        page: {
          id: string;
          handle: string;
          seo?: {
            title?: string | null;
            description?: string | null;
          };
        } | null;
        userErrors: Array<{ field?: string[] | null; message: string }>;
      } | null;
    }>(shopDomain, accessToken, {
      query: mutation,
      variables: {
        id: pageId,
        page: {
          seo: {
            title: seoTitle,
            description: seoDescription,
          },
        },
      },
      operationName: 'UpdatePageSeo',
    });

    const userErrors = data.pageUpdate?.userErrors ?? [];
    if (userErrors.length > 0) {
      this.logger.warn(
        `[ShopifyGraphQL] pageUpdate returned errors: ${userErrors
          .map((e) => e.message)
          .join('; ')}`,
      );
      throw new BadRequestException('Failed to update page SEO in Shopify');
    }

    return { pageId };
  }

  /**
   * [ASSETS-PAGES-1.1] Update Collection SEO in Shopify.
   * Uses the collectionUpdate mutation with seo field.
   *
   * @param shopDomain - The Shopify shop domain
   * @param accessToken - The Shopify access token
   * @param collectionHandle - The collection handle (from URL path /collections/{handle})
   * @param seoTitle - The new SEO title
   * @param seoDescription - The new SEO description
   */
  private async updateShopifyCollectionSeo(
    shopDomain: string,
    accessToken: string,
    collectionHandle: string,
    seoTitle: string,
    seoDescription: string,
  ): Promise<{ collectionId: string }> {
    // First, look up the collection by handle to get its ID
    const lookupQuery = `
      query GetCollectionByHandle($handle: String!) {
        collectionByHandle(handle: $handle) {
          id
        }
      }
    `;

    const lookupData = await this.executeShopifyGraphql<{
      collectionByHandle: { id: string } | null;
    }>(shopDomain, accessToken, {
      query: lookupQuery,
      variables: { handle: collectionHandle },
      operationName: 'GetCollectionByHandle',
    });

    if (!lookupData.collectionByHandle) {
      throw new BadRequestException(`Collection not found with handle: ${collectionHandle}`);
    }

    const collectionId = lookupData.collectionByHandle.id;

    // Now update the collection SEO
    const mutation = `
      mutation UpdateCollectionSeo($input: CollectionInput!) {
        collectionUpdate(input: $input) {
          collection {
            id
            handle
            seo {
              title
              description
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const data = await this.executeShopifyGraphql<{
      collectionUpdate: {
        collection: {
          id: string;
          handle: string;
          seo?: {
            title?: string | null;
            description?: string | null;
          };
        } | null;
        userErrors: Array<{ field?: string[] | null; message: string }>;
      } | null;
    }>(shopDomain, accessToken, {
      query: mutation,
      variables: {
        input: {
          id: collectionId,
          seo: {
            title: seoTitle,
            description: seoDescription,
          },
        },
      },
      operationName: 'UpdateCollectionSeo',
    });

    const userErrors = data.collectionUpdate?.userErrors ?? [];
    if (userErrors.length > 0) {
      this.logger.warn(
        `[ShopifyGraphQL] collectionUpdate returned errors: ${userErrors
          .map((e) => e.message)
          .join('; ')}`,
      );
      throw new BadRequestException('Failed to update collection SEO in Shopify');
    }

    return { collectionId };
  }

  /**
   * [ASSETS-PAGES-1.1] Public method to update Page SEO.
   * Validates project access, gets integration, and calls Shopify API.
   *
   * @param projectId - The project ID
   * @param pageHandle - The page handle
   * @param seoTitle - The new SEO title
   * @param seoDescription - The new SEO description
   * @param userId - The user ID (must be OWNER)
   */
  async updatePageSeo(
    projectId: string,
    pageHandle: string,
    seoTitle: string,
    seoDescription: string,
    userId: string,
  ): Promise<{
    projectId: string;
    pageHandle: string;
    shopDomain: string;
    seoTitle: string;
    seoDescription: string;
  }> {
    // [ROLES-3] OWNER-only for apply/mutation operations
    await this.roleResolution.assertOwnerRole(projectId, userId);

    // Get Shopify integration
    const integration = await this.getShopifyIntegration(projectId);
    if (!integration || !integration.accessToken || !integration.externalId) {
      throw new BadRequestException('No Shopify integration found for this project');
    }

    const shopDomain = integration.externalId;
    const accessToken = integration.accessToken;

    // Update SEO in Shopify
    await this.updateShopifyPageSeo(
      shopDomain,
      accessToken,
      pageHandle,
      seoTitle,
      seoDescription,
    );

    // Update local CrawlResult record
    await this.prisma.crawlResult.updateMany({
      where: {
        projectId,
        url: { endsWith: `/pages/${pageHandle}` },
      },
      data: {
        title: seoTitle,
        metaDescription: seoDescription,
      },
    });

    return {
      projectId,
      pageHandle,
      shopDomain,
      seoTitle,
      seoDescription,
    };
  }

  /**
   * [ASSETS-PAGES-1.1] Public method to update Collection SEO.
   * Validates project access, gets integration, and calls Shopify API.
   *
   * @param projectId - The project ID
   * @param collectionHandle - The collection handle
   * @param seoTitle - The new SEO title
   * @param seoDescription - The new SEO description
   * @param userId - The user ID (must be OWNER)
   */
  async updateCollectionSeo(
    projectId: string,
    collectionHandle: string,
    seoTitle: string,
    seoDescription: string,
    userId: string,
  ): Promise<{
    projectId: string;
    collectionHandle: string;
    shopDomain: string;
    seoTitle: string;
    seoDescription: string;
  }> {
    // [ROLES-3] OWNER-only for apply/mutation operations
    await this.roleResolution.assertOwnerRole(projectId, userId);

    // Get Shopify integration
    const integration = await this.getShopifyIntegration(projectId);
    if (!integration || !integration.accessToken || !integration.externalId) {
      throw new BadRequestException('No Shopify integration found for this project');
    }

    const shopDomain = integration.externalId;
    const accessToken = integration.accessToken;

    // Update SEO in Shopify
    await this.updateShopifyCollectionSeo(
      shopDomain,
      accessToken,
      collectionHandle,
      seoTitle,
      seoDescription,
    );

    // Update local CrawlResult record
    await this.prisma.crawlResult.updateMany({
      where: {
        projectId,
        url: { endsWith: `/collections/${collectionHandle}` },
      },
      data: {
        title: seoTitle,
        metaDescription: seoDescription,
      },
    });

    return {
      projectId,
      collectionHandle,
      shopDomain,
      seoTitle,
      seoDescription,
    };
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

interface ShopifyProductImage {
  id: string;
  src: string;
  altText?: string | null;
  position?: number;
}

interface ShopifyProduct {
  id: number;
  title: string;
  body_html?: string;
  handle?: string;
  metafields_global_title_tag?: string;
  metafields_global_description_tag?: string;
  images?: Array<ShopifyProductImage>;
  status?: string;
  productType?: string;
  vendor?: string;
}
