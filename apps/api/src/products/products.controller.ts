import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductsService, ProductListFilters } from './products.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * GET /projects/:projectId/products
   * Get all products for a project
   *
   * [LIST-SEARCH-FILTER-1] Query params:
   * - q: case-insensitive search across title and handle
   * - status: 'optimized' | 'needs_attention'
   * - hasDraft: 'true' | '1' to filter products with pending drafts
   */
  @Get(':projectId/products')
  async getProducts(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('hasDraft') hasDraft?: string,
  ) {
    // [LIST-SEARCH-FILTER-1] Build filters object from query params
    const filters: ProductListFilters = {};

    if (q && q.trim()) {
      filters.q = q.trim();
    }

    if (status === 'optimized' || status === 'needs_attention') {
      filters.status = status;
    }

    if (hasDraft === 'true' || hasDraft === '1') {
      filters.hasDraft = true;
    }

    return this.productsService.getProductsForProject(projectId, req.user.id, filters);
  }
}
