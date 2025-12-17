import { Module, forwardRef } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { PrismaService } from '../prisma.service';
import { GeminiClient } from './gemini.client';
import { BillingModule } from '../billing/billing.module';
import { ProjectsModule } from '../projects/projects.module';
import { AnswerGenerationService } from '../projects/answer-generation.service';
import { ProductIssueFixService } from './product-issue-fix.service';
import { TokenUsageService } from './token-usage.service';
import { AiUsageLedgerService } from './ai-usage-ledger.service';
import { AiUsageQuotaService } from './ai-usage-quota.service';

@Module({
  imports: [BillingModule, forwardRef(() => ProjectsModule)],
  controllers: [AiController],
  providers: [
    AiService,
    PrismaService,
    GeminiClient,
    AnswerGenerationService,
    ProductIssueFixService,
    TokenUsageService,
    AiUsageLedgerService,
    AiUsageQuotaService,
  ],
  exports: [
    AiService,
    AnswerGenerationService,
    ProductIssueFixService,
    TokenUsageService,
    AiUsageLedgerService,
    AiUsageQuotaService,
  ],
})
export class AiModule {}
