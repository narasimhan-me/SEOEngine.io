import type { Metadata } from 'next';

import { CTASection } from '@/components/marketing/deo/CTASection';
import { DeoAIVisibilitySection } from '@/components/marketing/deo/DeoAIVisibilitySection';
import { DeoAudienceSection } from '@/components/marketing/deo/DeoAudienceSection';
import { DeoComparisonTable } from '@/components/marketing/deo/DeoComparisonTable';
import { DeoEngineSection } from '@/components/marketing/deo/DeoEngineSection';
import { DeoFAQSection } from '@/components/marketing/deo/DeoFAQSection';
import { DeoHero } from '@/components/marketing/deo/DeoHero';
import { DeoPillarsSection } from '@/components/marketing/deo/DeoPillarsSection';
import { DeoResultsSection } from '@/components/marketing/deo/DeoResultsSection';
import { DeoWhySection } from '@/components/marketing/deo/DeoWhySection';

export const metadata: Metadata = {
  title: 'What is DEO? — Discovery Engine Optimization | EngineO.ai',
  description:
    'Learn what DEO (Discovery Engine Optimization) is, how it expands traditional SEO, and why it matters for visibility across Google, AI, and answer engines.',
};

export default function DeoPage() {
  return (
    <div className="bg-background">
      <DeoHero />
      <DeoWhySection />
      <DeoPillarsSection />
      <DeoAIVisibilitySection />
      <DeoResultsSection />
      <DeoComparisonTable />
      <DeoEngineSection />
      <DeoAudienceSection />
      <DeoFAQSection />
      <CTASection />
    </div>
  );
}
