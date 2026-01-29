import { Module, forwardRef } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductAnswerBlocksController } from './product-answer-blocks.controller';
import { ProductAnswerPackController } from './product-answer-pack.controller';
import { ProductsService } from './products.service';
import { AnswerBlockService } from './answer-block.service';
import { ProductAnswerPackService } from './product-answer-pack.service';
import { PrismaService } from '../prisma.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import { ProjectsModule } from '../projects/projects.module';
import { ShopifyModule } from '../shopify/shopify.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  // [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Import ProjectsModule for DeoIssuesService access
  imports: [ConfigModule, forwardRef(() => ProjectsModule), forwardRef(() => ShopifyModule)],
  controllers: [ProductsController, ProductAnswerBlocksController, ProductAnswerPackController],
  providers: [
    ProductsService,
    AnswerBlockService,
    ProductAnswerPackService,
    PrismaService,
    RoleResolutionService,
  ],
  exports: [ProductsService, AnswerBlockService],
})
export class ProductsModule {}
