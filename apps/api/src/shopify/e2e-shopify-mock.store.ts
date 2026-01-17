/**
 * [SHOPIFY-ASSET-SYNC-COVERAGE-1]
 * E2E-only in-memory mock store for Shopify Pages and Collections.
 *
 * This module should only be imported by:
 * - ShopifyService mock path (E2E mode)
 * - E2E testkit controller
 *
 * Provides setters/getters for mocked Shopify payload data and a reset helper.
 */

export interface MockShopifyPage {
  id: string;
  title: string;
  handle: string;
  updatedAt: string;
  seo?: {
    title: string | null;
    description: string | null;
  };
}

export interface MockShopifyCollection {
  id: string;
  title: string;
  handle: string;
  updatedAt: string;
  seo?: {
    title: string | null;
    description: string | null;
  };
}

export interface MockShopifyArticle {
  id: string;
  title: string;
  handle: string;
  blogHandle: string;
  publishedAt: string | null;
  updatedAt: string;
  seo?: {
    title: string | null;
    description: string | null;
  };
}

/**
 * E2E Shopify Mock Store (singleton)
 */
class E2EShopifyMockStore {
  private pages: MockShopifyPage[] = [];
  private collections: MockShopifyCollection[] = [];
  private articles: MockShopifyArticle[] = [];

  /**
   * Set mocked Shopify Pages for E2E tests.
   */
  setPages(pages: MockShopifyPage[]): void {
    this.pages = pages;
  }

  /**
   * Get mocked Shopify Pages.
   */
  getPages(): MockShopifyPage[] {
    return this.pages;
  }

  /**
   * Set mocked Shopify Collections for E2E tests.
   */
  setCollections(collections: MockShopifyCollection[]): void {
    this.collections = collections;
  }

  /**
   * Get mocked Shopify Collections.
   */
  getCollections(): MockShopifyCollection[] {
    return this.collections;
  }

  /**
   * Set mocked Shopify Articles (blog posts) for E2E tests.
   */
  setArticles(articles: MockShopifyArticle[]): void {
    this.articles = articles;
  }

  /**
   * Get mocked Shopify Articles (blog posts).
   */
  getArticles(): MockShopifyArticle[] {
    return this.articles;
  }

  /**
   * Reset all mocked data (used per test seed).
   */
  reset(): void {
    this.pages = [];
    this.collections = [];
    this.articles = [];
  }
}

// Export singleton instance
export const e2eShopifyMockStore = new E2EShopifyMockStore();
