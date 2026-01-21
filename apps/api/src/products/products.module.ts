import { Module, forwardRef } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductAnswerBlocksController } from './product-answer-blocks.controller';
import { ProductsService } from './products.service';
import { AnswerBlockService } from './answer-block.service';
import { PrismaService } from '../prisma.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  // [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Import ProjectsModule for DeoIssuesService access
  imports: [forwardRef(() => ProjectsModule)],
  controllers: [ProductsController, ProductAnswerBlocksController],
  providers: [
    ProductsService,
    AnswerBlockService,
    PrismaService,
    RoleResolutionService,
  ],
  exports: [ProductsService, AnswerBlockService],
})
export class ProductsModule {}
