import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { CreateCategoryDto } from './dto/category.dto';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  // Categories
  listCategories() {
    return this.prisma.productCategory.findMany({
      include: { translations: true, children: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    const cat = await this.prisma.productCategory.create({
      data: { slug: dto.slug, parentId: dto.parentId, sortOrder: dto.sortOrder ?? 0, isActive: dto.isActive ?? true },
    });
    if (dto.nameAr) await this.prisma.productCategoryTranslation.create({ data: { categoryId: cat.id, locale: 'ar', name: dto.nameAr } });
    if (dto.nameEn) await this.prisma.productCategoryTranslation.create({ data: { categoryId: cat.id, locale: 'en', name: dto.nameEn } });
    return cat;
  }

  // Products
  async listProducts(query: any) {
    const {
      search, categoryId, modelId, year, brand, countryOfOrigin, available, minPrice, maxPrice,
      page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc',
    } = query;

    const where: any = { isActive: true, isPublished: true };
    if (categoryId) where.categoryId = categoryId;
    if (brand) where.brand = brand;
    if (countryOfOrigin) where.countryOfOrigin = countryOfOrigin;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }
    if (search) {
      where.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { partCode: { contains: search, mode: 'insensitive' } },
        { oemReference: { contains: search, mode: 'insensitive' } },
        { translations: { some: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }
    if (modelId || year) {
      where.compatibility = {
        some: {
          modelId: modelId || undefined,
          years: year ? { some: { year: Number(year) } } : undefined,
        },
      };
    }
    if (available === 'true') {
      where.inventory = { stock: { gt: 0 } };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          translations: true,
          images: { orderBy: { sortOrder: 'asc' } },
          inventory: true,
          compatibility: { include: { model: true, years: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: Number(limit),
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) };
  }

  async getProduct(idOrSlug: string) {
    // try id first
    let product = await this.prisma.product.findUnique({
      where: { id: idOrSlug },
      include: {
        translations: true,
        images: { orderBy: { sortOrder: 'asc' } },
        inventory: true,
        compatibility: { include: { model: true, years: { include: { variant: true } } } },
        category: { include: { translations: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async createProduct(dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        sku: dto.sku,
        partCode: dto.partCode,
        oemReference: dto.oemReference,
        categoryId: dto.categoryId,
        countryOfOrigin: dto.countryOfOrigin,
        brand: dto.brand,
        price: dto.price,
        salePrice: dto.salePrice,
        isActive: dto.isActive ?? true,
        isPublished: dto.isPublished ?? true,
      },
    });

    if (dto.translations) {
      for (const t of dto.translations) {
        await this.prisma.productTranslation.create({
          data: { productId: product.id, locale: t.locale as any, name: t.name, description: t.description },
        });
      }
    }
    if (dto.images) {
      for (let i = 0; i < dto.images.length; i++) {
        await this.prisma.productImage.create({ data: { productId: product.id, url: dto.images[i], sortOrder: i } });
      }
    }
    if (dto.compatibility) {
      for (const c of dto.compatibility) {
        const comp = await this.prisma.productVehicleCompatibility.create({
          data: { productId: product.id, modelId: c.modelId },
        });
        for (const y of c.years) {
          await this.prisma.productCompatibilityYear.create({ data: { compatibilityId: comp.id, year: y } });
        }
      }
    }
    await this.prisma.inventory.create({ data: { productId: product.id, stock: 0 } });
    return this.getProduct(product.id);
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    await this.getProduct(id);
    await this.prisma.product.update({
      where: { id },
      data: {
        sku: dto.sku,
        partCode: dto.partCode,
        oemReference: dto.oemReference,
        categoryId: dto.categoryId,
        countryOfOrigin: dto.countryOfOrigin,
        brand: dto.brand,
        price: dto.price,
        salePrice: dto.salePrice,
        isActive: dto.isActive,
        isPublished: dto.isPublished,
      },
    });
    // translations upsert simple: delete and recreate
    if (dto.translations) {
      await this.prisma.productTranslation.deleteMany({ where: { productId: id } });
      for (const t of dto.translations) {
        await this.prisma.productTranslation.create({ data: { productId: id, locale: t.locale as any, name: t.name, description: t.description } });
      }
    }
    return this.getProduct(id);
  }

  async deleteProduct(id: string) {
    await this.getProduct(id);
    return this.prisma.product.delete({ where: { id } });
  }
}
