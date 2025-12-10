import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductAnswerBlocksController } from './product-answer-blocks.controller';
import { ProductsService } from './products.service';
import { AnswerBlockService } from './answer-block.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ProductsController, ProductAnswerBlocksController],
  providers: [ProductsService, AnswerBlockService, PrismaService],
  exports: [ProductsService, AnswerBlockService],
})
export class ProductsModule {}
