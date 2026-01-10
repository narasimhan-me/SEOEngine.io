import { Module, forwardRef } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma.service';
import { DeoScoreService, DeoSignalsService } from './deo-score.service';
import { DeoScoreProcessor } from './deo-score.processor';
import { DeoIssuesService } from './deo-issues.service';
import { AutomationService } from './automation.service';
import { AnswerEngineService } from './answer-engine.service';
import { AiModule } from '../ai/ai.module';
import { BillingModule } from '../billing/billing.module';
import { SeoScanService } from '../seo-scan/seo-scan.service';
import { ProductsModule } from '../products/products.module';
import { AnswerBlockAutomationProcessor } from './answer-block-automation.processor';
import { ProductAutomationController } from './product-automation.controller';
import { ShopifyModule } from '../shopify/shopify.module';
import { AutomationPlaybooksService } from './automation-playbooks.service';
import { AutomationPlaybookRunProcessor } from './automation-playbook-run.processor';
import { AutomationPlaybookRunsService } from './automation-playbook-runs.service';
import { SearchIntentService } from './search-intent.service';
import { SearchIntentController } from './search-intent.controller';
import { CompetitorsService } from './competitors.service';
import { CompetitorsController } from './competitors.controller';
import { OffsiteSignalsService } from './offsite-signals.service';
import { OffsiteSignalsController } from './offsite-signals.controller';
import { LocalDiscoveryService } from './local-discovery.service';
import { LocalDiscoveryController } from './local-discovery.controller';
import { MediaAccessibilityService } from './media-accessibility.service';
import { MediaAccessibilityController } from './media-accessibility.controller';
import { ProjectInsightsService } from './project-insights.service';
import { GeoService } from './geo.service';
import { GeoController } from './geo.controller';
import { GeoReportsService } from './geo-reports.service';
import { GeoReportsController } from './geo-reports.controller';
import { GeoReportsPublicController } from './geo-reports-public.controller';
import { GovernanceService } from './governance.service';
import { ApprovalsService } from './approvals.service';
import { AuditEventsService } from './audit-events.service';
import { GovernanceController } from './governance.controller';
import { GovernanceViewerService } from './governance-viewer.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import { WorkQueueService } from './work-queue.service';

@Module({
  imports: [
    forwardRef(() => AiModule),
    BillingModule,
    // [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1-FIXUP-1] Use forwardRef to match ProductsModule ↔ ProjectsModule mutual import
    forwardRef(() => ProductsModule),
    forwardRef(() => ShopifyModule),
  ],
  controllers: [ProjectsController, ProductAutomationController, SearchIntentController, CompetitorsController, OffsiteSignalsController, LocalDiscoveryController, MediaAccessibilityController, GeoController, GeoReportsController, GeoReportsPublicController, GovernanceController],
  providers: [
    ProjectsService,
    PrismaService,
    DeoScoreService,
    DeoSignalsService,
    DeoScoreProcessor,
    DeoIssuesService,
    ProjectInsightsService,
    AutomationService,
    AnswerEngineService,
    SeoScanService,
    AnswerBlockAutomationProcessor,
    AutomationPlaybooksService,
    AutomationPlaybookRunProcessor,
    AutomationPlaybookRunsService,
    SearchIntentService,
    CompetitorsService,
    OffsiteSignalsService,
    LocalDiscoveryService,
    MediaAccessibilityService,
    GeoService,
    GeoReportsService,
    GovernanceService,
    ApprovalsService,
    AuditEventsService,
    GovernanceViewerService,
    RoleResolutionService,
    WorkQueueService,
  ],
  // [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Added DeoIssuesService to exports for ProductsService injection
  exports: [ProjectsService, DeoScoreService, DeoIssuesService, AutomationService, AnswerEngineService, AutomationPlaybookRunsService, SearchIntentService, CompetitorsService, OffsiteSignalsService, LocalDiscoveryService, MediaAccessibilityService, GovernanceService, ApprovalsService, AuditEventsService, RoleResolutionService],
})
export class ProjectsModule {}
