import type { Metadata } from 'next';
import { ProductTourHero } from '@/components/marketing/ProductTourHero';
import { ProductTourDEOSection } from '@/components/marketing/ProductTourDEOSection';
import { ProductTourCrawlSection } from '@/components/marketing/ProductTourCrawlSection';
import { ProductTourIssuesSection } from '@/components/marketing/ProductTourIssuesSection';
import { ProductTourProductWorkspace } from '@/components/marketing/ProductTourProductWorkspace';
import { ProductTourContentWorkspace } from '@/components/marketing/ProductTourContentWorkspace';
import { ProductTourAutomation } from '@/components/marketing/ProductTourAutomation';
import { ProductTourPlatforms } from '@/components/marketing/ProductTourPlatforms';
import { ProductTourSEOComparison } from '@/components/marketing/ProductTourSEOComparison';
import { ProductTourCTASection } from '@/components/marketing/ProductTourCTASection';

export const metadata: Metadata = {
  title: 'Product Tour — EngineO.ai DEO Platform',
  description:
    'Walk through the full EngineO.ai DEO platform: crawling, DEO Score, Issues Engine, Product and Content Workspaces, automation, and supported platforms.',
};

export default function ProductTourPage() {
  return (
    <div className="bg-background">
      <ProductTourHero />
      <ProductTourDEOSection />
      <ProductTourCrawlSection />
      <ProductTourIssuesSection />
      <ProductTourProductWorkspace />
      <ProductTourContentWorkspace />
      <ProductTourAutomation />
      <ProductTourPlatforms />
      <ProductTourSEOComparison />
      <ProductTourCTASection />
    </div>
  );
}
