import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { redisConfig } from '../config/redis.config';
import { PrismaService } from '../prisma.service';
import { AiService } from '../ai/ai.service';
import { AnswerEngineService } from './answer-engine.service';
import { AnswerBlockService } from '../products/answer-block.service';
import { PlanId } from '../billing/plans';
import { AnswerabilityStatus, AnswerBlock } from '@engineo/shared';
import { ShopifyService } from '../shopify/shopify.service';

interface AnswerBlockAutomationJobPayload {
  projectId: string;
  productId: string;
  userId: string;
  triggerType: 'product_synced' | 'issue_detected';
  planId: PlanId;
  // [AUTOMATION-TRIGGER-TRUTHFULNESS-1] Run ID for product_synced idempotency tracking
  runId?: string;
}

@Injectable()
export class AnswerBlockAutomationProcessor
  implements OnModuleInit, OnModuleDestroy
{
  private worker: Worker<AnswerBlockAutomationJobPayload, void> | null = null;
  private readonly logger = new Logger(AnswerBlockAutomationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly answerEngineService: AnswerEngineService,
    private readonly answerBlockService: AnswerBlockService,
    private readonly shopifyService: ShopifyService
  ) {}

  async onModuleInit() {
    if (!redisConfig.isEnabled || !redisConfig.connection) {
      console.warn(
        '[AnswerBlockAutomationProcessor] Redis not configured - worker disabled'
      );
      return;
    }

    const enableQueueProcessors =
      process.env.ENABLE_QUEUE_PROCESSORS !== 'false';
    if (!enableQueueProcessors) {
      this.logger.warn(
        '[AnswerBlockAutomationProcessor] ENABLE_QUEUE_PROCESSORS=false - worker disabled'
      );
      return;
    }

    this.worker = new Worker<AnswerBlockAutomationJobPayload, void>(
      'answer_block_automation_queue',
      async (job: Job<AnswerBlockAutomationJobPayload>): Promise<void> => {
        const { projectId, productId, triggerType, planId, runId } = job.data;

        // [AUTOMATION-TRIGGER-TRUTHFULNESS-1] Mark run as RUNNING at job start
        if (runId) {
          await this.prisma.answerBlockAutomationRun
            .update({
              where: { id: runId },
              data: { status: 'RUNNING', startedAt: new Date() },
            })
            .catch((err) => {
              this.logger.warn(
                `[AnswerBlockAutomation] Failed to update run ${runId} to RUNNING: ${err.message}`
              );
            });
        }

        try {
          const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: {
              project: true,
            },
          });

          if (!product || product.projectId !== projectId) {
            this.logger.warn(
              `[AnswerBlockAutomation] Product ${productId} not found for project ${projectId}; skipping`
            );
            await this.prisma.answerBlockAutomationLog.create({
              data: {
                projectId,
                productId,
                triggerType,
                planId,
                action: 'skip_not_found',
                status: 'skipped',
              },
            });
            // [AUTOMATION-TRIGGER-TRUTHFULNESS-1] Mark run as SKIPPED
            if (runId) {
              await this.prisma.answerBlockAutomationRun
                .update({
                  where: { id: runId },
                  data: { status: 'SKIPPED', completedAt: new Date() },
                })
                .catch(() => {});
            }
            return;
          }

          const beforeBlocks =
            await this.answerBlockService.getAnswerBlocks(productId);

          // Secondary plan guard (primary gating happens before enqueue)
          if (planId === 'free') {
            await this.prisma.answerBlockAutomationLog.create({
              data: {
                projectId,
                productId,
                triggerType,
                planId,
                action: 'skip_plan_free',
                status: 'skipped',
                beforeAnswerBlocks: beforeBlocks.length
                  ? beforeBlocks
                  : undefined,
              },
            });
            // [AUTOMATION-TRIGGER-TRUTHFULNESS-1] Mark run as SKIPPED
            if (runId) {
              await this.prisma.answerBlockAutomationRun
                .update({
                  where: { id: runId },
                  data: { status: 'SKIPPED', completedAt: new Date() },
                })
                .catch(() => {});
            }
            return;
          }

          let action:
            | 'generate_missing'
            | 'regenerate_weak'
            | 'skip_no_action' = 'skip_no_action';

          if (!beforeBlocks.length) {
            action = 'generate_missing';
          } else {
            const hasWeakBlock = beforeBlocks.some((b: any) => {
              const confidence =
                typeof b.confidenceScore === 'number' ? b.confidenceScore : 0;
              return confidence > 0 && confidence < 0.7;
            });
            if (hasWeakBlock) {
              action = 'regenerate_weak';
            }
          }

          if (action === 'skip_no_action') {
            await this.prisma.answerBlockAutomationLog.create({
              data: {
                projectId,
                productId,
                triggerType,
                planId,
                action,
                status: 'skipped',
                beforeAnswerBlocks: beforeBlocks.length
                  ? beforeBlocks
                  : undefined,
              },
            });
            // [AUTOMATION-TRIGGER-TRUTHFULNESS-1] Mark run as SKIPPED
            if (runId) {
              await this.prisma.answerBlockAutomationRun
                .update({
                  where: { id: runId },
                  data: { status: 'SKIPPED', completedAt: new Date() },
                })
                .catch(() => {});
            }
            return;
          }

          const answerabilityStatus: AnswerabilityStatus =
            this.answerEngineService.computeAnswerabilityForProduct({
              id: product.id,
              title: product.title,
              description: product.description,
              seoTitle: product.seoTitle,
              seoDescription: product.seoDescription,
            });

          const generated: AnswerBlock[] =
            await this.aiService.generateProductAnswers(
              {
                id: product.id,
                projectId: product.projectId,
                title: product.title,
                description: product.description,
                seoTitle: product.seoTitle,
                seoDescription: product.seoDescription,
              },
              answerabilityStatus
            );

          if (!generated.length) {
            await this.prisma.answerBlockAutomationLog.create({
              data: {
                projectId,
                productId,
                triggerType,
                planId,
                action: 'skip_no_generated_answers',
                status: 'skipped',
                beforeAnswerBlocks: beforeBlocks.length
                  ? beforeBlocks
                  : undefined,
              },
            });
            // [AUTOMATION-TRIGGER-TRUTHFULNESS-1] Mark run as SKIPPED
            if (runId) {
              await this.prisma.answerBlockAutomationRun
                .update({
                  where: { id: runId },
                  data: { status: 'SKIPPED', completedAt: new Date() },
                })
                .catch(() => {});
            }
            return;
          }

          const afterBlocks =
            await this.answerBlockService.createOrUpdateAnswerBlocks(
              productId,
              generated.map((block) => ({
                questionId: block.questionId,
                question: block.question,
                answer: block.answer,
                confidence: block.confidence,
                sourceType: block.sourceType,
                factsUsed: block.factsUsed,
              }))
            );

          await this.prisma.answerBlockAutomationLog.create({
            data: {
              projectId,
              productId,
              triggerType,
              planId,
              action,
              status: 'succeeded',
              beforeAnswerBlocks: beforeBlocks.length
                ? beforeBlocks
                : undefined,
              afterAnswerBlocks: afterBlocks.length ? afterBlocks : undefined,
              modelUsed: 'ae_v1',
            },
          });

          // [AUTOMATION-TRIGGER-TRUTHFULNESS-1] Mark run as SUCCEEDED
          if (runId) {
            await this.prisma.answerBlockAutomationRun
              .update({
                where: { id: runId },
                data: { status: 'SUCCEEDED', completedAt: new Date() },
              })
              .catch(() => {});
          }

          this.logger.log(
            `[AnswerBlockAutomation] ${action} completed for product ${productId} (project ${projectId}, trigger=${triggerType})`
          );

          // Optionally sync Answer Blocks to Shopify metafields when the project-level
          // flag is enabled and a Shopify integration is present.
          if (product.project?.aeoSyncToShopifyMetafields) {
            try {
              const syncResult =
                await this.shopifyService.syncAnswerBlocksToShopify(product.id);
              await this.prisma.answerBlockAutomationLog.create({
                data: {
                  projectId,
                  productId,
                  triggerType,
                  planId,
                  action: 'answer_blocks_synced_to_shopify',
                  status: syncResult.errors.length ? 'failed' : 'succeeded',
                  errorMessage: syncResult.errors.length
                    ? `Metafield sync errors: ${syncResult.errors.join(', ')}`
                    : null,
                  modelUsed: 'ae_v1',
                },
              });
              if (syncResult.errors.length) {
                this.logger.warn(
                  `[AnswerBlockAutomation] Metafield sync had errors for product ${productId} (project ${projectId}): ${syncResult.errors.join(', ')}`
                );
              } else {
                this.logger.log(
                  `[AnswerBlockAutomation] Answer Blocks synced to Shopify metafields for product ${productId} (project ${projectId})`
                );
              }
            } catch (syncError) {
              this.logger.warn(
                `[AnswerBlockAutomation] Failed to sync Answer Blocks to Shopify metafields for product ${productId} (project ${projectId}): ${
                  syncError instanceof Error
                    ? syncError.message
                    : String(syncError)
                }`
              );
              await this.prisma.answerBlockAutomationLog.create({
                data: {
                  projectId,
                  productId,
                  triggerType,
                  planId,
                  action: 'answer_blocks_synced_to_shopify',
                  status: 'failed',
                  errorMessage:
                    syncError instanceof Error
                      ? syncError.message
                      : String(syncError),
                },
              });
              // Do not rethrow – metafield sync failures must not fail the core automation.
            }
          }
        } catch (error) {
          console.error(
            `[AnswerBlockAutomation] Failed to process job for product ${productId} (project ${projectId})`,
            error
          );

          await this.prisma.answerBlockAutomationLog.create({
            data: {
              projectId,
              productId,
              triggerType,
              planId,
              action: 'error',
              status: 'failed',
              errorMessage:
                error instanceof Error ? error.message : String(error),
            },
          });

          // [AUTOMATION-TRIGGER-TRUTHFULNESS-1] Mark run as FAILED
          if (runId) {
            const safeErrorMessage =
              error instanceof Error ? error.message : String(error);
            await this.prisma.answerBlockAutomationRun
              .update({
                where: { id: runId },
                data: {
                  status: 'FAILED',
                  completedAt: new Date(),
                  errorMessage: safeErrorMessage.substring(0, 500), // Truncate for safety
                },
              })
              .catch(() => {});
          }

          throw error;
        }
      },
      {
        connection: redisConfig.connection,
        prefix: redisConfig.prefix,
      }
    );
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
