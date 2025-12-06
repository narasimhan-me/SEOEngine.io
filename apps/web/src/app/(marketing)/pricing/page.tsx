import type { Metadata } from 'next';
import { PricingHero } from '@/components/marketing/PricingHero';
import { PricingTable } from '@/components/marketing/PricingTable';
import { PricingFAQ } from '@/components/marketing/PricingFAQ';
import { PricingCTASection } from '@/components/marketing/PricingCTASection';

export const metadata: Metadata = {
  title: 'Pricing — EngineO.ai DEO Platform',
  description:
    'Simple pricing for EngineO.ai, the Discovery Engine Optimization (DEO) platform. Choose between Free, Pro, and Business plans that grow with your projects.',
};

export default function PricingPage() {
  return (
    <div className="bg-white">
      <PricingHero />
      <PricingTable />
      <PricingFAQ />
      <PricingCTASection />
    </div>
  );
}
