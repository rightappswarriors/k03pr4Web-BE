// wholesale.service.ts
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { CustomerAuthService } from "./customer-auth.service";

@Injectable()
export class WholesaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomerAuthService,
  ) {}

  private readonly productInclude = {
    SupplierItemCategory: { select: { id: true, name: true } },
    SupplierCatalog: {
      select: {
        id: true,
        organizationId: true,
        Organization: { select: { id: true, name: true, verificationStatus: true } },
      },
    },
  };

  // ---- Products now sourced from MarketplaceListing, not raw SupplierItem ----

  async products(query: Record<string, string | undefined> = {}) {
    const listings = await this.prisma.marketplaceListing.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        SupplierItem: {
          deletedAt: null,
          isActive: true,
          ...(query.category ? { categoryId: query.category } : {}),
          ...(query.search?.trim()
            ? { name: { contains: query.search.trim(), mode: "insensitive" } }
            : {}),
        },
      },
      include: { SupplierItem: { include: this.productInclude } },
      orderBy: [{ featured: "desc" }, { searchRank: "desc" }],
      take: 50,
    });

    return listings.map((l) => this.mapProduct(l.SupplierItem));
  }
  async product(id: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { supplierItemId: id },
      include: {
        SupplierItem: {
          include: {
            ...this.productInclude,
            WholesaleCustomization: { where: { deletedAt: null } },
            WholesalePackaging: true,
            WholesaleShipping: true,
            WholesaleDocument: { where: { deletedAt: null } },
            reviews: {
              where: { deletedAt: null },
              orderBy: { createdAt: "desc" },
              include: { Organization: { select: { name: true, profilePhoto: true } } },
            },
            SupplierItemImage: {
              where: { deletedAt: null },
              orderBy: { sortOrder: "asc" },
            },
            PriceTier: {
              where: { deletedAt: null },
              orderBy: { minQty: "asc" },
            },
            ProductSpecification: {
              where: { deletedAt: null },
              orderBy: { sortOrder: "asc" },
            },
            SupplierItemVariant: {
              where: { deletedAt: null, isActive: true },
              include: {
                SupplierItemVariantValue: {
                  include: { SupplierItemVariantOption: { include: { SupplierItemVariantGroup: true } } },
                },
                SupplierItemRVariantImages: {
                  where: { deletedAt: null },
                  orderBy: { sortOrder: "asc" },
                },
              },
            },
          },
        },
      },
    });

    // Type assertion to handle Prisma's strict typing
    const supplierItem = (listing as any)?.SupplierItem;

    if (!listing || !supplierItem || listing.status !== "PUBLISHED") {
      throw new NotFoundException({ error: "Product not found" });
    }

    this.prisma.marketplaceListing
      .update({ where: { id: listing.id }, data: { views: { increment: 1 } } })
      .catch(() => { });

    const supplierCapabilities = await this.prisma.supplierCapability.findMany({
      where: { organizationId: supplierItem.SupplierCatalog.organizationId, deletedAt: null },
    });

    const reviews = supplierItem.reviews.map((r: any) => ({
      id: r.id,
      userName: r.Organization.name,
      userAvatar: r.Organization.profilePhoto ?? undefined,
      rating: r.rating,
      date: r.createdAt.toISOString(),
      comment: r.comment ?? "",
      verified: r.isVerifiedPurchase,
    }));

    const variants = supplierItem.SupplierItemVariant.map((v: any) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price,
      availableQty: v.availableQty,
      image: v.image,
      isDefault: v.isDefault,
      options: v.SupplierItemVariantValue.map((val: any) => ({
        group: val.SupplierItemVariantOption.SupplierItemVariantGroup.name,
        value: val.SupplierItemVariantOption.value,
        colorHex: val.SupplierItemVariantOption.colorHex ?? undefined,
      })),
      images: v.SupplierItemRVariantImages.map((img: any) => img.url),
    }));

    const images = supplierItem.SupplierItemImage.map((img: any) => img.url);

    const priceTiers = supplierItem.PriceTier.map((tier: any) => ({
      minQty: tier.minQty,
      maxQty: tier.maxQty ?? undefined,
      unitPrice: `${tier.price}`,
      currency: tier.currency,
    }));

    const attributes = supplierItem.ProductSpecification.map((spec: any) => ({
      name: spec.name,
      value: spec.value,
      unit: spec.unit ?? undefined,
      groupName: spec.groupName ?? undefined,
      category: spec.category ?? undefined,
    }));

    return {
      ...this.mapProduct(supplierItem),
      images, // Use images from SupplierItemImage relation
      customizations: supplierItem.WholesaleCustomization,
      packaging: supplierItem.WholesalePackaging ?? {},
      shippingInfo: supplierItem.WholesaleShipping ?? {},
      documents: supplierItem.WholesaleDocument,
      supplierCapabilities,
      reviews,
      variants,
      priceTiers,
      attributes,
    };
  }

  // Batch lookup for "Continue looking" (recently viewed, driven by localStorage ids)
  async productsByIds(ids: string[]) {
    if (!ids.length) return [];
    const listings = await this.prisma.marketplaceListing.findMany({
      where: { supplierItemId: { in: ids }, status: "PUBLISHED", deletedAt: null },
      include: { SupplierItem: { include: this.productInclude } },
    });
    const byId = new Map(listings.map((l) => [l.supplierItemId, this.mapProduct(l.SupplierItem)]));
    // preserve the caller's order (most-recent-first from localStorage)
    return ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  }

  async recommendations() {
    const listings = await this.prisma.marketplaceListing.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      orderBy: [{ featured: "desc" }, { searchRank: "desc" }],
      take: 6,
      include: { SupplierItem: { include: this.productInclude } },
    });
    return listings.map((l) => this.mapProduct(l.SupplierItem));
  }

  // Hero "Popular:" chips — all-time top terms, so they stay stable and don't flicker
  async popularSearches(limit = 4) {
    const grouped = await this.prisma.searchQuery.groupBy({
      by: ["normalizedTerm"],
      where: { deletedAt: null },
      _count: { normalizedTerm: true },
      orderBy: { _count: { normalizedTerm: "desc" } },
      take: limit,
    });

    if (grouped.length === 0) {
      return ["Cement", "Rice", "Solar panels", "Packaging"]; // cold-start fallback
    }
    return grouped.map((g) => g.normalizedTerm);
  }

  // "Frequently searched" panel — trending terms over a rolling window, mapped to
  // an actual matching product so it can render in the same RecommendationCard.
  // Rolling window (vs. all-time) so a stale spike from months ago doesn't stick
  // forever; simple count-in-window rather than a decay curve, since at this
  // volume of data a decay function is overkill and harder to reason about.
  async frequentlySearchedProducts(limit = 3, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const trending = await this.prisma.searchQuery.groupBy({
      by: ["normalizedTerm"],
      where: { createdAt: { gte: since }, deletedAt: null },
      _count: { normalizedTerm: true },
      orderBy: { _count: { normalizedTerm: "desc" } },
      take: limit * 3, // over-fetch: some terms may not match a live product
    });

    const results: ReturnType<typeof this.mapProduct>[] = [];
    for (const t of trending) {
      if (results.length >= limit) break;
      const listing = await this.prisma.marketplaceListing.findFirst({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          SupplierItem: { name: { contains: t.normalizedTerm, mode: "insensitive" }, deletedAt: null, isActive: true },
        },
        include: { SupplierItem: { include: this.productInclude } },
      });
      if (listing) results.push(this.mapProduct(listing.SupplierItem));
    }
    return results;
  }

  // ---- Everything else unchanged ----

  async submitRfq(data: {
    productId: string;
    quantity: string;
    targetPrice?: string;
    requirements?: string;
    deliveryDate?: string;
    contactMethod: "email" | "phone" | "chat";
  }) {
    const product = await this.prisma.supplierItem.findUnique({ where: { id: data.productId }, select: { name: true } });
    const quote = await this.prisma.wholesaleQuote.create({
      data: {
        productId: data.productId,
        productName: product?.name,
        quantity: data.quantity,
        targetPrice: data.targetPrice,
        status: "pending",
        currency: "PHP",
        notes: JSON.stringify({ requirements: data.requirements, deliveryDate: data.deliveryDate, contactMethod: data.contactMethod }),
      },
    });
    return { success: true, quoteId: quote.id };
  }

  async quotes() {
    const quotes = await this.prisma.wholesaleQuote.findMany({
      include: { SupplierItem: { include: { SupplierCatalog: { include: { Organization: true } } } } },
      orderBy: { submittedDate: "desc" },
    });
    return quotes.map((q) => ({
      id: q.id,
      productId: q.productId,
      productName: q.productName ?? q.SupplierItem.name,
      quantity: q.quantity,
      targetPrice: q.targetPrice,
      quotedPrice: q.quotedPrice,
      status: q.status,
      submittedDate: q.submittedDate,
      expiryDate: q.expiryDate,
      supplier: q.SupplierItem.SupplierCatalog.Organization.name,
      supplierVerified: q.SupplierItem.SupplierCatalog.Organization.verificationStatus === "VERIFIED",
    }));
  }

  // =====================
  // Wholesale Cart/Order Endpoints
  // =====================

  async getPricing(id: string) {
    const item = await this.prisma.supplierItem.findUnique({
      where: { id, deletedAt: null, isActive: true },
      include: {
        SupplierCatalog: {
          include: {
            Organization: { select: { id: true, name: true, verificationStatus: true, profilePhoto: true } },
          },
        },
        PriceTier: { where: { deletedAt: null }, orderBy: { minQty: "asc" } },
        SupplierItemVariantGroup: {
          include: {
            SupplierItemVariantOption: { orderBy: { sortOrder: "asc" } },
          },
        },
        SupplierItemVariant: {
          where: { deletedAt: null, isActive: true },
          include: {
            SupplierItemVariantValue: {
              include: {
                SupplierItemVariantOption: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException({ error: "Supplier item not found" });
    }

    return {
      supplierItem: {
        id: item.id,
        name: item.name,
        unitPrice: item.unitPrice,
        moq: item.moq,
        availableQty: item.availableQty,
        image: item.image,
      },
      priceTiers: item.PriceTier.map((t) => ({
        id: t.id,
        minQty: t.minQty,
        maxQty: t.maxQty ?? undefined,
        price: t.price,
        currency: t.currency,
      })),
      variantGroups: item.SupplierItemVariantGroup.map((g) => ({
        id: g.id,
        name: g.name,
        options: g.SupplierItemVariantOption.map((o) => ({
          id: o.id,
          value: o.value,
          colorHex: o.colorHex ?? undefined,
          image: o.image ?? undefined,
        })),
      })),
      variants: item.SupplierItemVariant.map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price,
        availableQty: v.availableQty,
        image: v.image ?? undefined,
        isActive: v.isActive,
        optionIds: v.SupplierItemVariantValue.map((val) => val.optionId),
      })),
    };
  }

  /**
   * Bracket pricing: ALL units charged at the single tier's price.
   * Given quantity Q, find the PriceTier where minQty <= Q AND (maxQty IS NULL OR Q <= maxQty).
   * Example: tier 1-1000 = ₱1000, tier 1001+ = ₱990, order 1050 units → 1050 × ₱990 = ₱1,039,500
   */
  private computeBracketPrice(quantity: number, priceTiers: { minQty: number; maxQty?: number | null; price: number }[]) {
    if (priceTiers.length === 0) return null;

    // Sort by minQty ascending and find matching tier
    const sorted = [...priceTiers].sort((a, b) => a.minQty - b.minQty);

    for (const tier of sorted) {
      const minOk = quantity >= tier.minQty;
      const maxOk = tier.maxQty === null ? true : quantity <= tier.maxQty;
      if (minOk && maxOk) {
        return tier;
      }
    }

    // If no tier found and the highest tier has no maxQty, use it
    const highestTier = sorted[sorted.length - 1];
    if (highestTier.maxQty === null && quantity >= highestTier.minQty) {
      return highestTier;
    }

    return null;
  }

  async priceQuote(id: string, body: { quantity: number; variantId?: string }) {
    const { quantity, variantId } = body;

    const item = await this.prisma.supplierItem.findUnique({
      where: { id, deletedAt: null, isActive: true },
      include: {
        PriceTier: { where: { deletedAt: null }, orderBy: { minQty: "asc" } },
        SupplierCatalog: { include: { Organization: true } },
      },
    });

    if (!item) {
      throw new NotFoundException({ error: "Supplier item not found" });
    }

    // If variant selected: use variant's flat price, ignore tiers
    if (variantId) {
      const variant = await this.prisma.supplierItemVariant.findUnique({
        where: { id: variantId, deletedAt: null },
      });

      if (!variant) {
        throw new NotFoundException({ error: "Variant not found" });
      }
      if (!variant.isActive) {
        throw new BadRequestException({ error: "Variant is not available" });
      }
      if (variant.availableQty < quantity) {
        throw new BadRequestException({ error: `Only ${variant.availableQty} units available for this variant` });
      }

      return {
        unitPrice: variant.price,
        subtotal: variant.price * quantity,
        tierApplied: null,
      };
    }

    // Base item pricing with bracket tiers
    if (quantity < item.moq) {
      throw new BadRequestException({ error: `Minimum order quantity is ${item.moq}` });
    }

    if (item.availableQty < quantity) {
      throw new BadRequestException({ error: `Only ${item.availableQty} units available in stock` });
    }

    const priceTiers = item.PriceTier.map((t) => ({
      minQty: t.minQty,
      maxQty: t.maxQty ?? null,
      price: t.price,
    }));

    const tierApplied = this.computeBracketPrice(quantity, priceTiers);

    if (!tierApplied) {
      // No tiers defined, fall back to unitPrice
      if (!item.unitPrice || item.unitPrice <= 0) {
        throw new BadRequestException({ error: "No pricing available for this product" });
      }
      return {
        unitPrice: item.unitPrice,
        subtotal: item.unitPrice * quantity,
        tierApplied: null,
      };
    }

    return {
      unitPrice: tierApplied.price,
      subtotal: tierApplied.price * quantity,
      tierApplied: {
        id: tierApplied.minQty.toString(),
        minQty: tierApplied.minQty,
        maxQty: tierApplied.maxQty ?? undefined,
        price: tierApplied.price,
        currency: "PHP",
      },
    };
  }

  /**
   * Add to wholesale cart - stores pending order for later checkout.
   * Uses separate wholesale cart tables to avoid mixing with retail cart.
   * Price is computed server-side using the same logic as price-quote.
   */
  async addToCart(authorization: string | undefined, body: {
    supplierItemId: string;
    variantId?: string;
    quantity: number;
  }) {
    // Note: In a full implementation, this would create a WholesaleCartItem record.
    // For now, we simulate success and return the computed pricing.
    // The frontend should call this after price-quote to ensure price consistency.
    const quote = await this.priceQuote(body.supplierItemId, {
      quantity: body.quantity,
      variantId: body.variantId,
    });

    // TODO: Create WholesaleCart/WholesaleCartItem records here when schema is added
    // For now, return the pricing as confirmation
    return {
      success: true,
      supplierItemId: body.supplierItemId,
      variantId: body.variantId,
      quantity: body.quantity,
      unitPrice: quote.unitPrice,
      subtotal: quote.subtotal,
    };
  }

  /**
   * Start Order - creates a PurchaseOrder directly (fast path, skips cart).
   * Computes pricing server-side and creates PO + POLineItem.
   */
  async startOrder(authorization: string | undefined, body: {
    supplierItemId: string;
    variantId?: string;
    quantity: number;
  }) {
    const user = await this.customers.currentUser(authorization);
    // Get user's organization (for wholesale buyers)
    const userOrg = await this.prisma.user.findUnique({
      where: { id: Number(user.id) },
      select: { orgId: true },
    });

    if (!userOrg?.orgId) {
      throw new BadRequestException({ error: "User must belong to an organization to place wholesale orders" });
    }

    const quote = await this.priceQuote(body.supplierItemId, {
      quantity: body.quantity,
      variantId: body.variantId,
    });

    const item = await this.prisma.supplierItem.findUnique({
      where: { id: body.supplierItemId, deletedAt: null, isActive: true },
      include: { SupplierCatalog: { include: { Organization: true } } },
    });

    if (!item) {
      throw new NotFoundException({ error: "Supplier item not found" });
    }

    const supplierOrgId = item.SupplierCatalog.organizationId;

    // Create PurchaseOrder
    const po = await this.prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-${Math.floor(100000 + Math.random() * 900000)}`,
        buyerOrgId: userOrg.orgId,
        supplierOrgId,
        status: "PENDING",
        totalAmount: quote.subtotal,
        deliveryOutletId: 1, // TODO: Resolve proper delivery outlet
      },
    });

    // Create POLineItem
    await this.prisma.pOLineItem.create({
      data: {
        id: `line-${Date.now()}`,
        poId: po.id,
        supplierItemId: body.supplierItemId,
        qty: body.quantity,
        unitPrice: quote.unitPrice,
        subtotal: quote.subtotal,
      },
    });

    return {
      orderId: po.id,
      orderNumber: po.poNumber,
      status: po.status,
    };
  }

  async categories() {
    const categories = await this.prisma.supplierItemCategory.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return categories.map((c) => ({ id: String(c.id), name: c.name }));
  }

  async featuredSuppliers() {
    const orgs = await this.prisma.organization.findMany({
      where: { deletedAt: null, roles: { has: "SUPPLIER" }, verificationStatus: "VERIFIED" },
      orderBy: { createdAt: "asc" },
      take: 6,
    });
    const now = Date.now();
    return orgs.map((o) => ({
      id: String(o.id),
      name: o.name,
      specialty: o.bio ?? "",
      location: o.location ?? "",
      years: Math.max(1, Math.floor((now - o.createdAt.getTime()) / (365 * 24 * 60 * 60 * 1000))),
      verified: o.verificationStatus === "VERIFIED",
    }));
  }

  async home() {
    const [categories, recommendations, featuredSuppliers, popularSearches, frequentlySearchedProducts] = await Promise.all([
      this.categories(),
      this.recommendations(),
      this.featuredSuppliers(),
      this.popularSearches(),
      this.frequentlySearchedProducts(),
    ]);
    return { categories, recommendations, featuredSuppliers, popularSearches, frequentlySearchedProducts, banners: [] };
  }
  // wholesale.service.ts
  async trackSearch(term: string, userId?: number) {
    const trimmed = term.trim();
    if (!trimmed) return { logged: false };

    await this.prisma.searchQuery.create({
      data: { term: trimmed, normalizedTerm: trimmed.toLowerCase(), userId },
    });

    // Bump searchRank for any published listing whose product name matches —
    // this is what makes "ranked by searches" mean something real over time.
    await this.prisma.marketplaceListing.updateMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        SupplierItem: { name: { contains: trimmed, mode: "insensitive" } },
      },
      data: { searchRank: { increment: 1 } },
    });

    return { logged: true };
  }

  // New: live suggestions as the user types, ranked by that same searchRank
  async suggestProducts(term: string, limit = 5) {
    const trimmed = term?.trim();
    if (!trimmed) return [];

    const listings = await this.prisma.marketplaceListing.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        SupplierItem: { name: { contains: trimmed, mode: "insensitive" }, isActive: true, deletedAt: null },
      },
      orderBy: [{ searchRank: "desc" }, { views: "desc" }],
      take: limit,
      include: { SupplierItem: { include: this.productInclude } },
    });

    return listings.map((l) => this.mapProduct(l.SupplierItem));
  }
  private mapProduct(item: any) {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      image: item.image,
      images: item.image ? [item.image] : [],
      price: item.unitPrice,
      unit: item.unit,
      moq: `${item.moq}`,
      sampleAvailable: item.sampleAvailable,
      samplePrice: item.samplePrice,
      leadTime: item.leadTime,
      shippingFrom: item.shippingFrom,
      verified: item.isActive,
      category: item.SupplierItemCategory?.name,
      supplier: item.SupplierCatalog?.Organization?.name,
      supplierVerified: item.SupplierCatalog?.Organization?.verificationStatus === "VERIFIED",
    };
  }
}