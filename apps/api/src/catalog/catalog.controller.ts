import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { AdminProductsQueryDto, CreateProductDto, ProductsQueryDto, UpdateProductDto } from './dto/product.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ImportProductsDto } from './dto/import-products.dto';
import { CreateCategoryDto } from './dto/category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller()
export class CatalogController {
  constructor(private service: CatalogService) {}

  @Get('categories')
  categories() {
    return this.service.listCategories();
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Get('products')
  listProducts(@Query() query: ProductsQueryDto) {
    return this.service.listProducts(query);
  }

  /** Staff view of the catalog: includes inactive and unpublished products. */
  @Get('admin/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER')
  adminProducts(@Query() query: AdminProductsQueryDto) {
    return this.service.adminListProducts(query);
  }

  @Post('products/import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER')
  importProducts(@Body() dto: ImportProductsDto) {
    return this.service.importProducts(dto);
  }

  @Get('admin/products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER')
  adminProduct(@Param('id') id: string) {
    return this.service.getProduct(id);
  }

  @Get('products/:id')
  getProduct(@Param('id') id: string) {
    return this.service.getPublicProduct(id);
  }

  @Post('products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER')
  createProduct(@Body() dto: CreateProductDto) {
    return this.service.createProduct(dto);
  }

  @Patch('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.updateProduct(id, dto);
  }

  /** Deleting is for administrators only; inventory managers can deactivate a part instead. */
  @Delete('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  deleteProduct(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.deleteProduct(id, user.id);
  }
}
