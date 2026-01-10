import type { Metadata } from 'next';
import { PricingHero } from '@/components/marketing/PricingHero';
import { PricingTable } from '@/components/marketing/PricingTable';
import { PricingFAQ } from '@/components/marketing/PricingFAQ';
import { PricingCTASection } from '@/components/marketing/PricingCTASection';

/**
 * [BILLING-GTM-1] Pricing page metadata with DEO + trust-safe framing.
 * Removed enterprise/sales implications.
 */
export const metadata: Metadata = {
  title: 'Pricing — EngineO.ai DEO Platform',
  description:
    'DEO plans that grow with your business. Optimize for search and AI discovery with trust-safe AI governance. Reuse saves AI runs; Apply is always free.',
};

export default function PricingPage() {
  return (
    <div className="bg-background">
      <PricingHero />
      <PricingTable />
      <PricingFAQ />
      <PricingCTASection />
    </div>
  );
}
