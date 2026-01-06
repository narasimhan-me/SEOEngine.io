import type { Metadata } from 'next';
import { WebsitesHero } from '@/components/marketing/WebsitesHero';
import { WebsitesFeatures } from '@/components/marketing/WebsitesFeatures';
import { WebsitesPlatforms } from '@/components/marketing/WebsitesPlatforms';
import { WebsitesFAQ } from '@/components/marketing/WebsitesFAQ';
import { WebsitesCTASection } from '@/components/marketing/WebsitesCTASection';

export const metadata: Metadata = {
  title: 'EngineO.ai for WordPress, Webflow & Websites',
  description:
    'EngineO.ai for WordPress, Webflow, Wix, Squarespace, Ghost, HubSpot CMS, and any website. Optimize pages, blogs, documentation, and landing pages for search and AI discovery.',
};

export default function WebsitesPage() {
  return (
    <div className="bg-background">
      <WebsitesHero />
      <WebsitesFeatures />
      <WebsitesPlatforms />
      <WebsitesFAQ />
      <WebsitesCTASection />
    </div>
  );
}
