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

@Module({
  imports: [
    forwardRef(() => AiModule),
    BillingModule,
    ProductsModule,
    forwardRef(() => ShopifyModule),
  ],
  controllers: [ProjectsController, ProductAutomationController, SearchIntentController, CompetitorsController],
  providers: [
    ProjectsService,
    PrismaService,
    DeoScoreService,
    DeoSignalsService,
    DeoScoreProcessor,
    DeoIssuesService,
    AutomationService,
    AnswerEngineService,
    SeoScanService,
    AnswerBlockAutomationProcessor,
    AutomationPlaybooksService,
    AutomationPlaybookRunProcessor,
    AutomationPlaybookRunsService,
    SearchIntentService,
    CompetitorsService,
  ],
  exports: [ProjectsService, DeoScoreService, AutomationService, AnswerEngineService, AutomationPlaybookRunsService, SearchIntentService, CompetitorsService],
})
export class ProjectsModule {}
