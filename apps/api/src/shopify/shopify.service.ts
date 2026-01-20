import { Injectable, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { IntegrationType } from '@prisma/client';
import * as crypto from 'crypto';
import { AutomationService } from '../projects/automation.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import { isE2EMode } from '../config/test-env-guard';
import {
  ShopifyCapability,
  parseShopifyScopesCsv,
  computeShopifyRequiredScopes,
  expandGrantedScopesWithImplications,
} from './shopify-scopes';

// [SHOPIFY-SCOPES-MATRIX-1] Re-export ShopifyCapability for backward compatibility
export type ShopifyScopeCapability = ShopifyCapability;

interface ShopifyOauthStatePayload {
  projectId: string;
  source: 'install' | 'reconnect';
  returnTo?: string;
  capability?: ShopifyScopeCapability;
  // [SHOPIFY-SCOPES-MATRIX-1] Server-computed scopes for OAuth
  enabledCapabilities?: ShopifyCapability[];
  requiredScopes?: string[];
  requestedScopes?: string[];
}

export interface ShopifyScopeStatus {
  capability: ShopifyScopeCapability;
  requiredScopes: string[];
  grantedScopes: string[];
  missingScopes: string[];
}

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
  // [SHOPIFY-SCOPES-MATRIX-1] Allowlist from environment (must be superset of computed required scopes)
  private readonly scopesAllowlistCsv: string;
  private readonly stateStore = new Map<string, ShopifyOauthStatePayload>(); // In production, use Redis

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
    // [SHOPIFY-ASSET-SYNC-COVERAGE-1] Add read_content scope for Pages sync
    this.scopes = this.config.get<string>('SHOPIFY_SCOPES', 'read_products,write_products,read_themes,read_content');
    // [SHOPIFY-SCOPES-MATRIX-1] Store raw allowlist for validation
    this.scopesAllowlistCsv = this.scopes;
  }

  private get isTestEnv(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  // [SHOPIFY-SCOPES-MATRIX-1] Delegate to shared parser
  private parseScopeList(scope: unknown): string[] {
    return parseShopifyScopesCsv(scope);
  }

  // [SHOPIFY-SCOPES-MATRIX-1-FIXUP-2] Least-privilege default install capabilities.
  // Only include capabilities that are actually enabled in-product.
  getEnabledCapabilitiesForOauth(): ShopifyCapability[] {
    return [
      'products_sync',
      'products_apply',
      'collections_sync',
      'pages_sync',
      'blogs_sync', // [BLOGS-ASSET-SYNC-COVERAGE-1] Include blogs_sync to request read_content scope
    ];
  }

  // [SHOPIFY-SCOPES-MATRIX-1-FIXUP-1] Validate that SHOPIFY_SCOPES allowlist is a superset of requested scopes
  private validateScopesAllowlistSuperset(requestedScopes: string[]): void {
    const allowlist = parseShopifyScopesCsv(this.scopesAllowlistCsv);
    const allowlistSet = new Set(allowlist);
    const missingFromAllowlist = requestedScopes.filter((s) => !allowlistSet.has(s));

    if (missingFromAllowlist.length > 0) {
      const errorMessage = `[SHOPIFY-SCOPES-MATRIX-1] SHOPIFY_SCOPES allowlist is missing requested scopes: ${missingFromAllowlist.join(', ')}. Allowlist: ${this.scopesAllowlistCsv}`;
      this.logger.error(errorMessage);

      // In non-production, fail fast to catch misconfigurations
      if (process.env.NODE_ENV !== 'production') {
        throw new BadRequestException(errorMessage);
      }
      // [SHOPIFY-SCOPES-MATRIX-1-FIXUP-1] In production, return safe error (no OAuth redirect)
      throw new BadRequestException({
        code: 'SHOPIFY_SCOPES_CONFIG_INVALID',
        message: 'Shopify scope configuration is invalid. Please contact support.',
      });
    }
  }

  // [SHOPIFY-SCOPES-MATRIX-1] Use centralized scope computation
  // [SHOPIFY-SCOPE-IMPLICATIONS-1] Use implication-aware coverage for missing scope detection
  private getScopeStatusFromIntegration(
    integration: any,
    capability: ShopifyScopeCapability,
  ): ShopifyScopeStatus {
    const storedScope = (integration?.config as any)?.scope ?? '';
    const grantedScopes = this.parseScopeList(storedScope);
    const requiredScopes = computeShopifyRequiredScopes([capability]);
    // [SHOPIFY-SCOPE-IMPLICATIONS-1] Expand granted scopes with implied scopes
    // (e.g., write_products ⇒ read_products) to prevent false "missing read_products" warnings
    const effectiveGranted = expandGrantedScopesWithImplications(grantedScopes);
    const missingScopes = requiredScopes.filter((s) => !effectiveGranted.has(s));
    return { capability, requiredScopes, grantedScopes, missingScopes };
  }

  // [SHOPIFY-SCOPES-MATRIX-1] Use centralized scope computation
  async getShopifyScopeStatus(
    projectId: string,
    capability: ShopifyScopeCapability,
  ): Promise<{ projectId: string; connected: boolean } & ShopifyScopeStatus> {
    const integration = await this.getShopifyIntegration(projectId);
    console.log('[getShopifyScopeStatus] Integration config:', {
      projectId,
      capability,
      hasIntegration: !!integration,
      externalId: integration?.externalId,
      hasAccessToken: !!integration?.accessToken,
      configScope: (integration?.config as any)?.scope,
    });
    if (!integration || !integration.externalId || !integration.accessToken) {
      return {
        projectId,
        connected: false,
        capability,
        requiredScopes: computeShopifyRequiredScopes([capability]),
        grantedScopes: [],
        missingScopes: [],
      };
    }
    const status = this.getScopeStatusFromIntegration(integration, capability);
    console.log('[getShopifyScopeStatus] Status result:', {
      projectId,
      capability,
      ...status,
    });
    return { projectId, connected: true, ...status };
  }

  getSafeReturnToForProject(returnTo: unknown, projectId: string): string | null {
    if (typeof returnTo !== 'string') return null;
    const value = returnTo.trim();
    if (!value) return null;
    if (!value.startsWith('/')) return null;
    if (value.startsWith('//')) return null;
    if (!value.startsWith(`/projects/${projectId}`)) return null;
    return value;
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
      // Handle OAuth token exchange endpoint
      // [SHOPIFY-SCOPE-RECONSENT-UX-1-FIXUP-3] Include read_content for pages_sync capability
      if (url && typeof url === 'string' && url.includes('/admin/oauth/access_token')) {
        // Return mock token response
        return {
          ok: true,
          json: async () => ({
            access_token: 'access-token-123',
            scope: 'read_products,write_products,read_content',
          }),
          text: async () => '',
        };
      }

      // [SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1] Handle Access Scopes endpoint
      // This is the fallback truth source when OAuth scope string is empty/suspicious
      if (url && typeof url === 'string' && url.includes('/admin/oauth/access_scopes.json')) {
        return {
          ok: true,
          json: async () => ({
            access_scopes: [
              { handle: 'read_products' },
              { handle: 'write_products' },
              { handle: 'read_content' },
            ],
          }),
          text: async () => '',
        };
      }

      const body = init?.body ? JSON.parse(init.body as string) : {};
      const operationName = body.operationName as string | undefined;

      if (operationName === 'UpdateProductSeo') {
        // Check if test wants to simulate userErrors (via special variable)
        const simulateErrors = body.variables?.input?.seo?.title === '__SIMULATE_ERRORS__';
        return {
          ok: true,
          json: async () => ({
            data: {
              productUpdate: simulateErrors
                ? {
                    product: null,
                    userErrors: [{ message: 'Title is too long' }],
                  }
                : {
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

      if (operationName === 'GetProducts') {
        // Mock products list for sync-products endpoint in test mode
        // Return a few test products to allow sync to work
        return {
          ok: true,
          json: async () => ({
            data: {
              products: {
                pageInfo: {
                  hasNextPage: false,
                  endCursor: null,
                },
                edges: [
                  {
                    node: {
                      id: 'gid://shopify/Product/1',
                      title: 'Test Product 1',
                      handle: 'test-product-1',
                      descriptionHtml: '<p>Test description 1</p>',
                      status: 'ACTIVE',
                      productType: 'Test Type',
                      vendor: 'Test Vendor',
                      seo: {
                        title: 'Test SEO Title 1',
                        description: 'Test SEO Description 1',
                      },
                      images: {
                        edges: [],
                      },
                      variants: {
                        edges: [],
                      },
                    },
                  },
                ],
              },
            },
          }),
          text: async () => '',
        };
      }

      // [SHOPIFY-ASSET-SYNC-COVERAGE-1] E2E mock for GetPages
      if (operationName === 'GetPages') {
        // Import mock store and return seeded data
        const { e2eShopifyMockStore } = await import('./e2e-shopify-mock.store');
        const pages = e2eShopifyMockStore.getPages();
        return {
          ok: true,
          json: async () => ({
            data: {
              pages: {
                edges: pages.map((page: any) => ({
                  node: {
                    id: `gid://shopify/Page/${page.id}`,
                    title: page.title,
                    handle: page.handle,
                    updatedAt: page.updatedAt,
                    seo: page.seo ?? { title: null, description: null },
                  },
                })),
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          }),
          text: async () => '',
        };
      }

      // [SHOPIFY-ASSET-SYNC-COVERAGE-1] E2E mock for GetCollections
      if (operationName === 'GetCollections') {
        // Import mock store and return seeded data
        const { e2eShopifyMockStore } = await import('./e2e-shopify-mock.store');
        const collections = e2eShopifyMockStore.getCollections();
        return {
          ok: true,
          json: async () => ({
            data: {
              collections: {
                edges: collections.map((coll: any) => ({
                  node: {
                    id: `gid://shopify/Collection/${coll.id}`,
                    title: coll.title,
                    handle: coll.handle,
                    updatedAt: coll.updatedAt,
                    seo: coll.seo ?? { title: null, description: null },
                  },
                })),
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          }),
          text: async () => '',
        };
      }

      // [BLOGS-ASSET-SYNC-COVERAGE-1] E2E mock for GetArticles
      if (operationName === 'GetArticles') {
        const { e2eShopifyMockStore } = await import('./e2e-shopify-mock.store');
        const articles = e2eShopifyMockStore.getArticles();
        return {
          ok: true,
          json: async () => ({
            data: {
              articles: {
                edges: articles.map((a: any) => ({
                  node: {
                    id: `gid://shopify/Article/${a.id}`,
                    title: a.title,
                    handle: a.handle,
                    publishedAt: a.publishedAt,
                    updatedAt: a.updatedAt,
                    blog: { handle: a.blogHandle },
                    seo: a.seo ?? { title: null, description: null },
                  },
                })),
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          }),
          text: async () => '',
        };
      }

      // Fallback: generic success envelope.
      // For OAuth endpoints, return a proper token response
      if (url && typeof url === 'string' && url.includes('/admin/oauth/access_token')) {
        return {
          ok: true,
          json: async () => ({
            access_token: 'access-token-123',
            scope: 'read_products,write_products',
          }),
          text: async () => '',
        };
      }
      return {
        ok: true,
        json: async () => ({ data: {} }),
        text: async () => '',
      };
    } catch {
      // For OAuth endpoints in catch block, return a proper token response
      if (url && typeof url === 'string' && url.includes('/admin/oauth/access_token')) {
        return {
          ok: true,
          json: async () => ({
            access_token: 'access-token-123',
            scope: 'read_products,write_products',
          }),
          text: async () => '',
        };
      }
      return {
        ok: true,
        json: async () => ({ data: {} }),
        text: async () => '',
      };
    }
  }

  private async rateLimitedFetch(url: string, init: any): Promise<any> {
    // Check if global.fetch is a Jest mock function (for integration tests)
    // Jest mocks have _isMockFunction property or mock property
    // We need to distinguish between native Node.js fetch and Jest mocks
    const fetchFn = (global as any).fetch;
    
    // Only treat as Jest mock if it has explicit Jest mock properties
    // Native Node.js fetch doesn't have these properties
    // Check for Jest mock function indicators
    const isJestMock = fetchFn && typeof fetchFn === 'function' && (
      (fetchFn._isMockFunction === true) ||
      (fetchFn.mock !== undefined && fetchFn.mock !== null && Array.isArray(fetchFn.mock.calls))
    );
    
    // In test mode, always use e2e mock unless fetch is explicitly mocked with Jest
    if (this.isTestEnv) {
      // Check for Jest mock FIRST, so tests can override default behavior
      if (isJestMock) {
        // If explicitly mocked with Jest, use it (allows tests to control success/failure)
        return fetch(url, init);
      }
      // For OAuth endpoints, always return proper token response in test mode
      // This bypasses the e2e mock to ensure consistent behavior
      // Unless fetch is explicitly mocked (which allows error testing)
      // [SHOPIFY-SCOPE-RECONSENT-UX-1-FIXUP-3] Include read_content for pages_sync capability
      if (url && typeof url === 'string' && url.includes('/admin/oauth/access_token')) {
        return {
          ok: true,
          json: async () => ({
            access_token: 'access-token-123',
            scope: 'read_products,write_products,read_content',
          }),
          text: async () => '',
        };
      }
      // For other endpoints, use e2e mock
      try {
        const mockResponse = await this.e2eMockShopifyFetch(url, init);
        // Ensure we always return a valid response with ok: true
        if (mockResponse && typeof mockResponse === 'object' && mockResponse.ok === true) {
          return mockResponse;
        }
      } catch (error) {
        // If e2e mock throws an error, fall through to fallback
      }
      // Fallback: return a generic success response
      return {
        ok: true,
        json: async () => ({ data: {} }),
        text: async () => '',
      };
    }
    
    if (isE2EMode()) {
      // In E2E mode, use e2e mock
      return await this.e2eMockShopifyFetch(url, init);
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
   * [SHOPIFY-SCOPES-MATRIX-1] Generate the Shopify OAuth URL for installation.
   * Scopes are now computed server-side based on enabled capabilities.
   */
  generateInstallUrl(
    shop: string,
    projectId: string,
    opts?: {
      scopesCsv?: string;
      returnTo?: string | null;
      source?: ShopifyOauthStatePayload['source'];
      capability?: ShopifyScopeCapability;
    },
  ): string {
    const state = crypto.randomBytes(16).toString('hex');

    // [SHOPIFY-SCOPES-MATRIX-1-FIXUP-1] Compute scopes server-side
    // For reconnect, use only the triggering capability; for install, use all capabilities
    const enabledCapabilities =
      opts?.source === 'reconnect' && opts?.capability
        ? [opts.capability]
        : this.getEnabledCapabilitiesForOauth();
    const requiredScopes = computeShopifyRequiredScopes(enabledCapabilities);

    // [SHOPIFY-SCOPES-MATRIX-1-FIXUP-1] Determine requested scopes: explicit override (reconnect) or minimal required scopes (install)
    let requestedScopes: string[];
    if (opts?.scopesCsv) {
      requestedScopes = parseShopifyScopesCsv(opts.scopesCsv);
    } else {
      requestedScopes = requiredScopes;
    }
    // Deduplicate and sort for deterministic comparison
    requestedScopes = Array.from(new Set(requestedScopes)).sort();
    // Validate allowlist covers all requested scopes
    this.validateScopesAllowlistSuperset(requestedScopes);

    // Store state with server-computed scope metadata
    this.stateStore.set(state, {
      projectId,
      source: opts?.source ?? 'install',
      ...(opts?.returnTo ? { returnTo: opts.returnTo } : {}),
      ...(opts?.capability ? { capability: opts.capability } : {}),
      enabledCapabilities,
      requiredScopes,
      requestedScopes,
    });

    const redirectUri = `${this.appUrl}/shopify/callback`;
    const requestedScopesCsv = requestedScopes.join(',');
    const params = new URLSearchParams({
      client_id: this.apiKey,
      scope: requestedScopesCsv,
      redirect_uri: redirectUri,
      state,
    });

    console.log('[Shopify] generateInstallUrl:', {
      shop,
      projectId,
      source: opts?.source,
      capability: opts?.capability,
      enabledCapabilities,
      requiredScopes,
      requestedScopes,
      returnTo: opts?.returnTo,
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
   * Validate state parameter and retrieve payload
   */
  validateState(state: string): ShopifyOauthStatePayload | null {
    const payload = this.stateStore.get(state);
    if (payload) {
      this.stateStore.delete(state);
      return payload;
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

    if (!response || !response.ok) {
      throw new BadRequestException('Failed to exchange token with Shopify');
    }

    return response.json() as Promise<{ access_token: string; scope: string }>;
  }

  /**
   * [SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1] Fetch access scopes from Shopify Admin API.
   *
   * Uses the Access Scopes endpoint to get the authoritative list of granted scopes.
   * This is the fallback when OAuth token exchange scope string is empty/suspicious.
   *
   * @param shopDomain - The shop domain (e.g., "mystore.myshopify.com")
   * @param accessToken - The freshly issued access token
   * @returns Array of scope handles (e.g., ["read_products", "write_products"])
   */
  private async fetchAccessScopes(
    shopDomain: string,
    accessToken: string,
  ): Promise<string[]> {
    const url = `https://${shopDomain}/admin/oauth/access_scopes.json`;

    const response = await this.rateLimitedFetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response || !response.ok) {
      this.logger.warn(
        `[SHOPIFY-SCOPE-TRUTH-1] Failed to fetch access scopes from ${shopDomain}`,
      );
      return [];
    }

    try {
      const data = (await response.json()) as {
        access_scopes?: Array<{ handle: string }>;
      };
      const scopes = data.access_scopes?.map((s) => s.handle) ?? [];
      return scopes;
    } catch (err) {
      this.logger.warn(
        `[SHOPIFY-SCOPE-TRUTH-1] Failed to parse access scopes response: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return [];
    }
  }

  /**
   * [SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1] Normalize and deduplicate scopes.
   *
   * Returns a comma-separated string of scopes in canonical sorted order.
   *
   * @param scopes - Array of scope strings
   * @returns Normalized, deduplicated, sorted, comma-separated scope string
   */
  private normalizeScopes(scopes: string[]): string {
    const unique = [...new Set(scopes.map((s) => s.trim()).filter(Boolean))];
    unique.sort();
    return unique.join(',');
  }

  /**
   * Persist Shopify integration in database
   *
   * [SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1] Authoritative granted-scope derivation:
   * 1. If OAuth scope string is present, non-empty, and parseable → use it (oauth_scope)
   * 2. Otherwise → call Access Scopes endpoint with fresh token (access_scopes_endpoint)
   * 3. Persist normalized (deduplicated, sorted, comma-separated) scope string
   *
   * [SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 FIXUP-1] Suspicious-scope detection:
   * If expectedScopes is provided and OAuth scope string doesn't include all expected scopes,
   * treat OAuth scope as "suspicious" and fall back to Access Scopes endpoint.
   * This handles edge cases where Shopify returns a partial OAuth scope string.
   */
  async storeShopifyConnection(
    projectId: string,
    shopDomain: string,
    accessToken: string,
    scope: string,
    expectedScopes?: string,
  ) {
    // [SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1] Derive authoritative granted scopes
    let authoritativeScopes: string[];
    let truthSource: 'oauth_scope' | 'access_scopes_endpoint' | 'access_scopes_endpoint_suspicious';

    const parsedOauthScopes = parseShopifyScopesCsv(scope);
    const parsedExpectedScopes = parseShopifyScopesCsv(expectedScopes);

    // [SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 FIXUP-1] Check if OAuth scope is suspicious
    // (missing expected scopes that were requested in the OAuth flow)
    const isSuspicious =
      parsedExpectedScopes.length > 0 &&
      parsedOauthScopes.length > 0 &&
      !parsedExpectedScopes.every((s) => parsedOauthScopes.includes(s));

    if (isSuspicious) {
      this.logger.warn(
        `[SHOPIFY-SCOPE-TRUTH-1] OAuth scope suspicious: expected=[${parsedExpectedScopes.join(',')}], ` +
          `got=[${parsedOauthScopes.join(',')}]. Falling back to Access Scopes endpoint.`,
      );
    }

    if (parsedOauthScopes.length > 0 && !isSuspicious) {
      // OAuth scope string is present, parseable, and not suspicious - use as truth source
      authoritativeScopes = parsedOauthScopes;
      truthSource = 'oauth_scope';
    } else {
      // Fallback: fetch from Access Scopes endpoint
      authoritativeScopes = await this.fetchAccessScopes(shopDomain, accessToken);
      truthSource = isSuspicious ? 'access_scopes_endpoint_suspicious' : 'access_scopes_endpoint';
    }

    // Normalize: deduplicate, sort, join
    const normalizedScope = this.normalizeScopes(authoritativeScopes);

    this.logger.log(
      `[SHOPIFY-SCOPE-TRUTH-1] Storing connection: projectId=${projectId}, shop=${shopDomain}, ` +
        `truthSource=${truthSource}, scopes=${normalizedScope}`,
    );

    const existing = await this.prisma.integration.findUnique({
      where: {
        projectId_type: {
          projectId,
          type: IntegrationType.SHOPIFY,
        },
      },
    });
    const existingConfig = (existing?.config as any) || {};

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
          scope: normalizedScope,
          installedAt: new Date().toISOString(),
        },
      },
      update: {
        externalId: shopDomain,
        accessToken,
        config: {
          ...existingConfig,
          scope: normalizedScope,
          installedAt: new Date().toISOString(),
          uninstalledAt: null,
        },
      },
    });

    // [SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1] Log authoritative scope storage (no secrets)
    this.logger.log(
      `[SHOPIFY-SCOPE-TRUTH-1] Upserted integration: id=${integration.id}, shop=${shopDomain}, ` +
        `truthSource=${truthSource}, normalizedScopes=${normalizedScope}`,
    );

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

    // [SHOPIFY-ASSET-SYNC-COVERAGE-1] Update sync timestamp on integration config
    const existingConfig = (integration.config as any) || {};
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: {
        config: {
          ...existingConfig,
          lastProductsSyncAt: new Date().toISOString(),
        },
      },
    });

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

  // ===========================================================================
  // [SHOPIFY-ASSET-SYNC-COVERAGE-1] Pages and Collections Sync
  // ===========================================================================

  /**
   * Fetch Shopify Pages via Admin GraphQL (metadata only, no body).
   * Uses stable operationName GetPages for deterministic mocking/tests.
   */
  private async fetchShopifyPages(
    shopDomain: string,
    accessToken: string,
  ): Promise<Array<{
    id: string;
    title: string;
    handle: string;
    updatedAt: string;
    seo: { title: string | null; description: string | null };
  }>> {
    const query = `
      query GetPages($first: Int!, $after: String) {
        pages(first: $first, after: $after) {
          edges {
            node {
              id
              title
              handle
              updatedAt
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const allPages: Array<{
      id: string;
      title: string;
      handle: string;
      updatedAt: string;
      seo: { title: string | null; description: string | null };
    }> = [];

    let hasNextPage = true;
    let cursor: string | null = null;

    while (hasNextPage) {
      const data = await this.executeShopifyGraphql<{
        pages: {
          edges: Array<{
            node: {
              id: string;
              title: string;
              handle: string;
              updatedAt: string;
            };
          }>;
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      }>(shopDomain, accessToken, {
        query,
        variables: { first: 50, after: cursor },
        operationName: 'GetPages',
      });

      for (const edge of data.pages.edges) {
        // Shopify Page type doesn't have seo field in Admin API
        // Set seo to null - SEO data will be synced from crawl results
        allPages.push({
          ...edge.node,
          seo: { title: null, description: null },
        });
      }

      hasNextPage = data.pages.pageInfo.hasNextPage;
      cursor = data.pages.pageInfo.endCursor;
    }

    return allPages;
  }

  /**
   * Fetch Shopify Collections via Admin GraphQL (metadata only, no body).
   * Uses stable operationName GetCollections for deterministic mocking/tests.
   */
  private async fetchShopifyCollections(
    shopDomain: string,
    accessToken: string,
  ): Promise<Array<{
    id: string;
    title: string;
    handle: string;
    updatedAt: string;
    seo: { title: string | null; description: string | null };
  }>> {
    const query = `
      query GetCollections($first: Int!, $after: String) {
        collections(first: $first, after: $after) {
          edges {
            node {
              id
              title
              handle
              updatedAt
              seo {
                title
                description
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const allCollections: Array<{
      id: string;
      title: string;
      handle: string;
      updatedAt: string;
      seo: { title: string | null; description: string | null };
    }> = [];

    let hasNextPage = true;
    let cursor: string | null = null;

    while (hasNextPage) {
      const data = await this.executeShopifyGraphql<{
        collections: {
          edges: Array<{
            node: {
              id: string;
              title: string;
              handle: string;
              updatedAt: string;
              seo: { title: string | null; description: string | null };
            };
          }>;
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      }>(shopDomain, accessToken, {
        query,
        variables: { first: 50, after: cursor },
        operationName: 'GetCollections',
      });

      for (const edge of data.collections.edges) {
        allCollections.push(edge.node);
      }

      hasNextPage = data.collections.pageInfo.hasNextPage;
      cursor = data.collections.pageInfo.endCursor;
    }

    return allCollections;
  }

  /**
   * [BLOGS-ASSET-SYNC-COVERAGE-1] Fetch Shopify Articles (blog posts) via Admin GraphQL (metadata only).
   * Uses stable operationName GetArticles for deterministic mocking/tests.
   */
  private async fetchShopifyArticles(
    shopDomain: string,
    accessToken: string,
  ): Promise<Array<{
    id: string;
    title: string;
    handle: string;
    publishedAt: string | null;
    updatedAt: string;
    blog: { handle: string } | null;
    seo: { title: string | null; description: string | null };
  }>> {
    const query = `
      query GetArticles($first: Int!, $after: String) {
        articles(first: $first, after: $after) {
          edges {
            node {
              id
              title
              handle
              publishedAt
              updatedAt
              blog { handle }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    `;

    const allArticles: Array<{
      id: string;
      title: string;
      handle: string;
      publishedAt: string | null;
      updatedAt: string;
      blog: { handle: string } | null;
      seo: { title: string | null; description: string | null };
    }> = [];

    let hasNextPage = true;
    let cursor: string | null = null;

    while (hasNextPage) {
      const data = await this.executeShopifyGraphql<{
        articles: {
          edges: Array<{
            node: {
              id: string;
              title: string;
              handle: string;
              publishedAt: string | null;
              updatedAt: string;
              blog: { handle: string } | null;
            };
          }>;
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      }>(shopDomain, accessToken, {
        query,
        variables: { first: 50, after: cursor },
        operationName: 'GetArticles',
      });

      for (const edge of data.articles.edges) {
        // Shopify Article type doesn't have seo field in Admin API
        // Set seo to null - SEO data will be synced from crawl results
        allArticles.push({
          ...edge.node,
          seo: { title: null, description: null },
        });
      }

      hasNextPage = data.articles.pageInfo.hasNextPage;
      cursor = data.articles.pageInfo.endCursor;
    }

    return allArticles;
  }

  /**
   * Extract numeric ID from Shopify GID (e.g., "gid://shopify/Page/123" -> "123")
   */
  private extractShopifyId(gid: string): string {
    const match = gid.match(/\/(\d+)$/);
    return match ? match[1] : gid;
  }

  /**
   * Sync Shopify Pages into CrawlResult (metadata only).
   * Returns counts + completedAt + warnings.
   */
  async syncPages(projectId: string): Promise<{
    projectId: string;
    fetched: number;
    upserted: number;
    skipped: number;
    completedAt: string;
    warnings?: string[];
  }> {
    const integration = await this.getShopifyIntegration(projectId);
    if (!integration || !integration.accessToken || !integration.externalId) {
      throw new BadRequestException('No Shopify integration found for this project');
    }

    const scopeStatus = this.getScopeStatusFromIntegration(integration, 'pages_sync');
    if (scopeStatus.missingScopes.length > 0) {
      throw new BadRequestException({
        code: 'SHOPIFY_MISSING_SCOPES',
        message: `Missing required Shopify scope(s): ${scopeStatus.missingScopes.join(', ')}`,
        projectId,
        ...scopeStatus,
      });
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new BadRequestException('Project not found');
    }

    const shopDomain = integration.externalId;
    const accessToken = integration.accessToken;

    // Fetch Pages from Shopify
    const pages = await this.fetchShopifyPages(shopDomain, accessToken);

    const warnings: string[] = [];
    let upserted = 0;
    let skipped = 0;
    const now = new Date();

    for (const page of pages) {
      // Skip pages without handle
      if (!page.handle) {
        warnings.push(`Skipped page ${page.id}: missing handle`);
        skipped++;
        continue;
      }

      const resourceId = this.extractShopifyId(page.id);
      const domain = project.domain || shopDomain;
      const url = `https://${domain}/pages/${page.handle}`;

      // Upsert into CrawlResult using compound unique key
      await this.prisma.crawlResult.upsert({
        where: {
          projectId_shopifyResourceType_shopifyResourceId: {
            projectId,
            shopifyResourceType: 'PAGE',
            shopifyResourceId: resourceId,
          },
        },
        create: {
          projectId,
          url,
          statusCode: 200,
          title: page.seo?.title || null,
          metaDescription: page.seo?.description || null,
          h1: page.title,
          wordCount: null,
          loadTimeMs: null,
          issues: [],
          scannedAt: now,
          shopifyResourceType: 'PAGE',
          shopifyResourceId: resourceId,
          shopifyHandle: page.handle,
          shopifyUpdatedAt: new Date(page.updatedAt),
          shopifySyncedAt: now,
        },
        update: {
          url,
          title: page.seo?.title || null,
          metaDescription: page.seo?.description || null,
          h1: page.title,
          shopifyHandle: page.handle,
          shopifyUpdatedAt: new Date(page.updatedAt),
          shopifySyncedAt: now,
        },
      });

      upserted++;
    }

    // Update sync timestamp on integration config
    const existingConfig = (integration.config as any) || {};
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: {
        config: {
          ...existingConfig,
          lastPagesSyncAt: now.toISOString(),
        },
      },
    });

    return {
      projectId,
      fetched: pages.length,
      upserted,
      skipped,
      completedAt: now.toISOString(),
      ...(warnings.length > 0 && { warnings }),
    };
  }

  /**
   * Sync Shopify Collections into CrawlResult (metadata only).
   * Returns counts + completedAt + warnings.
   */
  async syncCollections(projectId: string): Promise<{
    projectId: string;
    fetched: number;
    upserted: number;
    skipped: number;
    completedAt: string;
    warnings?: string[];
  }> {
    const integration = await this.getShopifyIntegration(projectId);
    if (!integration || !integration.accessToken || !integration.externalId) {
      throw new BadRequestException('No Shopify integration found for this project');
    }

    const scopeStatus = this.getScopeStatusFromIntegration(integration, 'collections_sync');
    if (scopeStatus.missingScopes.length > 0) {
      throw new BadRequestException({
        code: 'SHOPIFY_MISSING_SCOPES',
        message: `Missing required Shopify scope(s): ${scopeStatus.missingScopes.join(', ')}`,
        projectId,
        ...scopeStatus,
      });
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new BadRequestException('Project not found');
    }

    const shopDomain = integration.externalId;
    const accessToken = integration.accessToken;

    // Fetch Collections from Shopify
    const collections = await this.fetchShopifyCollections(shopDomain, accessToken);

    const warnings: string[] = [];
    let upserted = 0;
    let skipped = 0;
    const now = new Date();

    for (const coll of collections) {
      // Skip collections without handle
      if (!coll.handle) {
        warnings.push(`Skipped collection ${coll.id}: missing handle`);
        skipped++;
        continue;
      }

      const resourceId = this.extractShopifyId(coll.id);
      const domain = project.domain || shopDomain;
      const url = `https://${domain}/collections/${coll.handle}`;

      // Upsert into CrawlResult using compound unique key
      await this.prisma.crawlResult.upsert({
        where: {
          projectId_shopifyResourceType_shopifyResourceId: {
            projectId,
            shopifyResourceType: 'COLLECTION',
            shopifyResourceId: resourceId,
          },
        },
        create: {
          projectId,
          url,
          statusCode: 200,
          title: coll.seo?.title || null,
          metaDescription: coll.seo?.description || null,
          h1: coll.title,
          wordCount: null,
          loadTimeMs: null,
          issues: [],
          scannedAt: now,
          shopifyResourceType: 'COLLECTION',
          shopifyResourceId: resourceId,
          shopifyHandle: coll.handle,
          shopifyUpdatedAt: new Date(coll.updatedAt),
          shopifySyncedAt: now,
        },
        update: {
          url,
          title: coll.seo?.title || null,
          metaDescription: coll.seo?.description || null,
          h1: coll.title,
          shopifyHandle: coll.handle,
          shopifyUpdatedAt: new Date(coll.updatedAt),
          shopifySyncedAt: now,
        },
      });

      upserted++;
    }

    // Update sync timestamp on integration config
    const existingConfig = (integration.config as any) || {};
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: {
        config: {
          ...existingConfig,
          lastCollectionsSyncAt: now.toISOString(),
        },
      },
    });

    return {
      projectId,
      fetched: collections.length,
      upserted,
      skipped,
      completedAt: now.toISOString(),
      ...(warnings.length > 0 && { warnings }),
    };
  }

  /**
   * [BLOGS-ASSET-SYNC-COVERAGE-1] Sync Shopify Blog Posts (Articles) into CrawlResult (metadata only).
   * Returns counts + completedAt + warnings.
   */
  async syncBlogPosts(projectId: string): Promise<{
    projectId: string;
    fetched: number;
    upserted: number;
    skipped: number;
    completedAt: string;
    warnings?: string[];
  }> {
    const integration = await this.getShopifyIntegration(projectId);
    if (!integration || !integration.accessToken || !integration.externalId) {
      throw new BadRequestException('No Shopify integration found for this project');
    }

    const scopeStatus = this.getScopeStatusFromIntegration(integration, 'blogs_sync');
    if (scopeStatus.missingScopes.length > 0) {
      throw new BadRequestException({
        code: 'SHOPIFY_MISSING_SCOPES',
        message: `Missing required Shopify scope(s): ${scopeStatus.missingScopes.join(', ')}`,
        projectId,
        ...scopeStatus,
      });
    }

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new BadRequestException('Project not found');
    }

    const shopDomain = integration.externalId;
    const accessToken = integration.accessToken;

    const articles = await this.fetchShopifyArticles(shopDomain, accessToken);

    const warnings: string[] = [];
    let upserted = 0;
    let skipped = 0;
    const now = new Date();

    for (const article of articles) {
      if (!article.handle) {
        warnings.push(`Skipped article ${article.id}: missing handle`);
        skipped++;
        continue;
      }

      const blogHandle = article.blog?.handle;
      if (!blogHandle) {
        warnings.push(`Skipped article ${article.id}: missing blog handle`);
        skipped++;
        continue;
      }

      const resourceId = this.extractShopifyId(article.id);
      const domain = project.domain || shopDomain;
      const url = `https://${domain}/blogs/${blogHandle}/${article.handle}`;

      await this.prisma.crawlResult.upsert({
        where: {
          projectId_shopifyResourceType_shopifyResourceId: {
            projectId,
            shopifyResourceType: 'ARTICLE',
            shopifyResourceId: resourceId,
          },
        },
        create: {
          projectId,
          url,
          statusCode: 200,
          title: article.title ?? null,
          metaDescription: article.seo?.description ?? null,
          h1: article.title ?? null,
          wordCount: null,
          loadTimeMs: null,
          issues: [],
          scannedAt: now,
          shopifyResourceType: 'ARTICLE',
          shopifyResourceId: resourceId,
          shopifyHandle: article.handle,
          shopifyBlogHandle: blogHandle,
          shopifyUpdatedAt: new Date(article.updatedAt),
          shopifyPublishedAt: article.publishedAt ? new Date(article.publishedAt) : null,
          shopifySyncedAt: now,
        },
        update: {
          url,
          title: article.title ?? null,
          metaDescription: article.seo?.description ?? null,
          h1: article.title ?? null,
          shopifyHandle: article.handle,
          shopifyBlogHandle: blogHandle,
          shopifyUpdatedAt: new Date(article.updatedAt),
          shopifyPublishedAt: article.publishedAt ? new Date(article.publishedAt) : null,
          shopifySyncedAt: now,
        },
      });

      upserted++;
    }

    const existingConfig = (integration.config as any) || {};
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: {
        config: {
          ...existingConfig,
          lastBlogsSyncAt: now.toISOString(),
        },
      },
    });

    return {
      projectId,
      fetched: articles.length,
      upserted,
      skipped,
      completedAt: now.toISOString(),
      ...(warnings.length > 0 && { warnings }),
    };
  }

  /**
   * Get sync status timestamps for a project.
   * Returns lastProductsSyncAt, lastPagesSyncAt, lastCollectionsSyncAt, lastBlogsSyncAt (null when never synced).
   */
  async getSyncStatus(projectId: string): Promise<{
    projectId: string;
    lastProductsSyncAt: string | null;
    lastPagesSyncAt: string | null;
    lastCollectionsSyncAt: string | null;
    lastBlogsSyncAt: string | null;
  }> {
    const integration = await this.getShopifyIntegration(projectId);

    const config = (integration?.config as any) || {};

    return {
      projectId,
      lastProductsSyncAt: config.lastProductsSyncAt ?? null,
      lastPagesSyncAt: config.lastPagesSyncAt ?? null,
      lastCollectionsSyncAt: config.lastCollectionsSyncAt ?? null,
      lastBlogsSyncAt: config.lastBlogsSyncAt ?? null,
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
