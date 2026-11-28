import { BadRequestException, ConflictException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AdminProductsQueryDto, CompatibilityDto, CreateProductDto, ProductsQueryDto, UpdateProductDto } from './dto/product.dto';
import { AuditService } from '../audit/audit.service';
import { ImportProductsDto, ImportRowDto } from './dto/import-products.dto';
import { CreateCategoryDto } from './dto/category.dto';

type Tx = Prisma.TransactionClient;

/** Stock at or below this counts as "low" in the admin list (matches the default lowStockThreshold of an inventory row). */
export const LOW_STOCK = 5;
const IMPORT_DEFAULT_YEAR_FROM = 2010;

/** undefined stays "leave unchanged"; text that was cleared becomes null. */
const blankToNull = (v: string | undefined) => (v === undefined ? undefined : v.trim() || null);

export type ImportRowResult = { row: number; sku: string; status: 'created' | 'updated' | 'error'; errors?: string[] };

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

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
  async listProducts(query: ProductsQueryDto) {
    const {
      search, categoryId, modelId, year, brand, countryOfOrigin, available, minPrice, maxPrice,
      page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc',
    } = query;

    const where: Prisma.ProductWhereInput = { isActive: true, isPublished: true };
    if (categoryId) where.categoryId = categoryId;
    if (brand) where.brand = brand;
    if (countryOfOrigin) where.countryOfOrigin = countryOfOrigin;
    if (minPrice || maxPrice) {
      where.price = { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) };
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
          years: year ? { some: { year } } : undefined,
        },
      };
    }
    if (available === 'true') {
      where.inventory = { stock: { gt: 0 } };
    }

    const skip = (page - 1) * limit;
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
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** What a shopper may see: a part that is switched off or unpublished does not exist for them. */
  async getPublicProduct(id: string) {
    const product = await this.getProduct(id);
    if (!product.isActive || !product.isPublished) throw new NotFoundException('Product not found');
    return product;
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

  // ---- write side -------------------------------------------------------------------------------------------

  private rethrowKnown(e: unknown): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') throw new ConflictException('A product with this SKU already exists');
      if (e.code === 'P2003') throw new ConflictException('This product is used by orders. Deactivate it instead of deleting it');
    }
    throw e;
  }

  private assertTranslations(dto: { translations?: { locale: string; name: string }[] }, required: boolean) {
    if (dto.translations === undefined) {
      if (required) throw new BadRequestException('At least one translated name is required');
      return;
    }
    if (!dto.translations.some((t) => t.name.trim())) throw new BadRequestException('At least one translated name is required');
    if (new Set(dto.translations.map((t) => t.locale)).size !== dto.translations.length) {
      throw new BadRequestException('Each language can only appear once in translations');
    }
  }

  private async assertModelsExist(compatibility?: CompatibilityDto[]) {
    if (!compatibility?.length) return;
    const ids = compatibility.map((c) => c.modelId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('A vehicle model can only appear once in compatibility');
    const found = await this.prisma.vehicleModel.count({ where: { id: { in: ids } } });
    if (found !== ids.length) throw new BadRequestException('Unknown vehicle model in compatibility');
  }

  /** Writes translations, images and compatibility. Sections that are not in the payload are left alone; the ones that are replace what was there. */
  private async writeChildren(tx: Tx, productId: string, dto: Pick<CreateProductDto, 'translations' | 'images' | 'compatibility'>) {
    if (dto.translations !== undefined) {
      await tx.productTranslation.deleteMany({ where: { productId } });
      await tx.productTranslation.createMany({
        data: dto.translations.map((t) => ({ productId, locale: t.locale as 'ar' | 'en', name: t.name.trim(), description: t.description?.trim() || null })),
      });
    }
    if (dto.images !== undefined) {
      await tx.productImage.deleteMany({ where: { productId } });
      await tx.productImage.createMany({ data: dto.images.map((url, sortOrder) => ({ productId, url, sortOrder })) });
    }
    if (dto.compatibility !== undefined) {
      await tx.productVehicleCompatibility.deleteMany({ where: { productId } }); // year rows cascade
      for (const c of dto.compatibility) {
        const comp = await tx.productVehicleCompatibility.create({ data: { productId, modelId: c.modelId } });
        const years = [...new Set(c.years)];
        if (years.length) await tx.productCompatibilityYear.createMany({ data: years.map((year) => ({ compatibilityId: comp.id, year })) });
      }
    }
  }

  async createProduct(dto: CreateProductDto) {
    this.assertTranslations(dto, true);
    await this.assertModelsExist(dto.compatibility);
    try {
      const id = await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            sku: dto.sku.trim(),
            partCode: dto.partCode?.trim() || null,
            oemReference: dto.oemReference?.trim() || null,
            categoryId: dto.categoryId,
            countryOfOrigin: dto.countryOfOrigin?.trim() || null,
            brand: dto.brand?.trim() || null,
            price: dto.price,
            salePrice: dto.salePrice,
            isActive: dto.isActive ?? true,
            isPublished: dto.isPublished ?? true,
          },
        });
        await this.writeChildren(tx, product.id, dto);
        const inventory = await tx.inventory.create({ data: { productId: product.id, stock: dto.stock ?? 0 } });
        if (dto.stock) {
          await tx.inventoryMovement.create({ data: { inventoryId: inventory.id, type: 'IN', quantity: dto.stock, note: 'Opening stock' } });
        }
        return product.id;
      });
      return this.getProduct(id);
    } catch (e) {
      this.rethrowKnown(e);
    }
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    await this.getProduct(id);
    this.assertTranslations(dto, false);
    await this.assertModelsExist(dto.compatibility);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id },
          data: {
            sku: dto.sku?.trim(),
            partCode: blankToNull(dto.partCode),
            oemReference: blankToNull(dto.oemReference),
            categoryId: dto.categoryId,
            countryOfOrigin: blankToNull(dto.countryOfOrigin),
            brand: blankToNull(dto.brand),
            price: dto.price,
            salePrice: dto.salePrice,
            isActive: dto.isActive,
            isPublished: dto.isPublished,
          },
        });
        await this.writeChildren(tx, id, dto);
      });
      return this.getProduct(id);
    } catch (e) {
      this.rethrowKnown(e);
    }
  }

  async deleteProduct(id: string, userId?: string) {
    const snapshot = await this.getProduct(id);
    try {
      const deleted = await this.prisma.product.delete({ where: { id } });
      // The whole record is kept in the audit log, so a deletion (by mistake or by someone who should not) can be undone by hand.
      await this.audit
        .log(userId, 'product.delete', 'Product', id, JSON.parse(JSON.stringify({ snapshot })))
        .catch(() => undefined);
      return deleted;
    } catch (e) {
      this.rethrowKnown(e);
    }
  }

  // ---- admin list -------------------------------------------------------------------------------------------

  /** Every product, including inactive and unpublished ones (the public list only shows what shoppers can buy). */
  async adminListProducts(q: AdminProductsQueryDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const where: Prisma.ProductWhereInput = {};
    if (q.status === 'active') Object.assign(where, { isActive: true, isPublished: true });
    if (q.status === 'inactive') where.isActive = false;
    if (q.status === 'unpublished') Object.assign(where, { isActive: true, isPublished: false });
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.lowStock) where.inventory = { is: { stock: { lte: LOW_STOCK } } };
    if (q.search) {
      where.OR = [
        { sku: { contains: q.search, mode: 'insensitive' } },
        { partCode: { contains: q.search, mode: 'insensitive' } },
        { oemReference: { contains: q.search, mode: 'insensitive' } },
        { translations: { some: { name: { contains: q.search, mode: 'insensitive' } } } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          translations: true,
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          inventory: true,
          category: { include: { translations: true } },
          _count: { select: { compatibility: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ---- CSV import -------------------------------------------------------------------------------------------

  private cleanRow(raw: Record<string, unknown>): Record<string, unknown> {
    // CSV cells are text; blank cells mean "not provided".
    return Object.fromEntries(
      Object.entries(raw)
        .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v] as const)
        .filter(([, v]) => v !== '' && v !== null && v !== undefined),
    );
  }

  private async parseImportRow(
    raw: Record<string, unknown>,
    models: Map<string, string>,
    categories: Map<string, string>,
    seen: Set<string>,
  ): Promise<{ errors: string[] } | { row: ImportRowDto; categoryId?: string; compatibility?: CompatibilityDto[] }> {
    const row = plainToInstance(ImportRowDto, this.cleanRow(raw));
    // One message per column: a text value in a number column fails several rules at once, so prefer the type message.
    const errors = (await validate(row)).map((e) => {
      const found = e.constraints ?? {};
      const key = Object.keys(found).find((k) => ['isNumber', 'isInt', 'isString'].includes(k)) ?? Object.keys(found)[0];
      return found[key] ?? `${e.property} is invalid`;
    });
    if (row.sku) {
      const key = row.sku.toLowerCase();
      if (seen.has(key)) errors.push('duplicate SKU in this file');
      seen.add(key);
    }
    let categoryId: string | undefined;
    if (row.category) {
      categoryId = categories.get(row.category.toLowerCase());
      if (!categoryId) errors.push(`unknown category "${row.category}"`);
    }
    let compatibility: CompatibilityDto[] | undefined;
    if (row.models) {
      const from = row.yearFrom ?? IMPORT_DEFAULT_YEAR_FROM;
      const to = row.yearTo ?? new Date().getFullYear();
      if (from > to) errors.push('yearFrom must not be after yearTo');
      const years = Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
      const slugs = [...new Set(row.models.split(/[|,;\s]+/).filter(Boolean).map((m) => m.toLowerCase()))];
      compatibility = [];
      for (const slug of slugs) {
        const modelId = models.get(slug);
        if (!modelId) errors.push(`unknown model "${slug}"`);
        else compatibility.push({ modelId, years });
      }
    }
    return errors.length ? { errors } : { row, categoryId, compatibility };
  }

  private async applyImportRow(
    parsed: { row: ImportRowDto; categoryId?: string; compatibility?: CompatibilityDto[] },
    existing: { id: string; inventory: { id: string; stock: number; reserved: number } | null } | null,
  ): Promise<'created' | 'updated'> {
    const { row, categoryId, compatibility } = parsed;
    const fields = {
      price: row.price,
      partCode: row.partCode,
      oemReference: row.oemReference,
      brand: row.brand,
      countryOfOrigin: row.countryOfOrigin,
      categoryId,
    };
    await this.prisma.$transaction(async (tx) => {
      const product = existing
        ? await tx.product.update({ where: { id: existing.id }, data: fields })
        : await tx.product.create({ data: { sku: row.sku, ...fields } });

      for (const [locale, name, description] of [
        ['ar', row.nameAr, row.descAr],
        ['en', row.nameEn, row.descEn],
      ] as const) {
        if (!name) continue;
        await tx.productTranslation.upsert({
          where: { productId_locale: { productId: product.id, locale } },
          update: { name, ...(description ? { description } : {}) },
          create: { productId: product.id, locale, name, description: description ?? null },
        });
      }
      if (compatibility) await this.writeChildren(tx, product.id, { compatibility });

      const inventory = existing?.inventory;
      if (!inventory) {
        const created = await tx.inventory.create({ data: { productId: product.id, stock: row.stock ?? 0 } });
        if (row.stock) await tx.inventoryMovement.create({ data: { inventoryId: created.id, type: 'IN', quantity: row.stock, note: 'CSV import' } });
      } else if (row.stock !== undefined && row.stock !== inventory.stock) {
        if (row.stock < inventory.reserved) throw new BadRequestException(`stock cannot be below the ${inventory.reserved} units already reserved`);
        await tx.inventory.update({ where: { id: inventory.id }, data: { stock: row.stock } });
        await tx.inventoryMovement.create({ data: { inventoryId: inventory.id, type: 'ADJUSTMENT', quantity: row.stock - inventory.stock, note: 'CSV import' } });
      }
    });
    return existing ? 'updated' : 'created';
  }

  /** Creates or updates products by SKU from CSV rows. Each row stands alone: a bad row is reported, the others still apply. */
  async importProducts(dto: ImportProductsDto) {
    const [modelRows, categoryRows] = await Promise.all([
      this.prisma.vehicleModel.findMany({ select: { id: true, slug: true } }),
      this.prisma.productCategory.findMany({ select: { id: true, slug: true } }),
    ]);
    const models = new Map(modelRows.map((m) => [m.slug.toLowerCase(), m.id]));
    const categories = new Map(categoryRows.map((c) => [c.slug.toLowerCase(), c.id]));
    const seen = new Set<string>();
    const results: ImportRowResult[] = [];

    for (const [i, raw] of dto.rows.entries()) {
      const rowNo = i + 1;
      const sku = typeof raw.sku === 'string' ? raw.sku.trim() : '';
      const parsed = await this.parseImportRow(raw, models, categories, seen);
      if ('errors' in parsed) {
        results.push({ row: rowNo, sku, status: 'error', errors: parsed.errors });
        continue;
      }
      const existing = await this.prisma.product.findUnique({
        where: { sku: parsed.row.sku },
        select: { id: true, inventory: { select: { id: true, stock: true, reserved: true } } },
      });
      if (!existing && !parsed.row.nameAr && !parsed.row.nameEn) {
        results.push({ row: rowNo, sku, status: 'error', errors: ['nameAr or nameEn is required for a new product'] });
        continue;
      }
      if (dto.dryRun) {
        results.push({ row: rowNo, sku, status: existing ? 'updated' : 'created' });
        continue;
      }
      try {
        results.push({ row: rowNo, sku, status: await this.applyImportRow(parsed, existing) });
      } catch (e) {
        results.push({ row: rowNo, sku, status: 'error', errors: [e instanceof HttpException ? e.message : 'Could not save this row'] });
      }
    }

    const count = (status: ImportRowResult['status']) => results.filter((r) => r.status === status).length;
    return { dryRun: Boolean(dto.dryRun), summary: { created: count('created'), updated: count('updated'), failed: count('error') }, results };
  }
}
