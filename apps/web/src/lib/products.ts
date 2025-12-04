export interface Product {
  id: string;
  externalId: string;
  title: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  imageUrls: string[] | null;
  lastSyncedAt: string;
}

