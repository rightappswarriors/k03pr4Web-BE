import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { parsePositiveId, parseRequiredFloat } from "../common/validation";

interface NearestOutletResult {
    outletId: number;
    name: string;
    latitude: number;
    longitude: number;
    distance: number;
    price: number;
    quantity: number;
    photo: string | null;
    deliveryConfig: {
        isDeliveryActive: boolean;
        baseDeliveryFee: number;
    } | null;
    operatingHours: string | null;
}

interface PaginatedOutletResult {
    outlets: NearestOutletResult[];
    nextCursor: string | null;
    hasMore: boolean;
}

@Injectable()
export class OutletService {
    constructor(private prisma: PrismaService) { }

    private haversineDistance(
        lat1: number, lng1: number,
        lat2: number, lng2: number,
    ): number {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private getBoundingBox(lat: number, lng: number, radiusKm: number) {
        const latDelta = radiusKm / 111;
        const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
        return {
            minLat: lat - latDelta,
            maxLat: lat + latDelta,
            minLng: lng - lngDelta,
            maxLng: lng + lngDelta,
        };
    }

    async getNearestOutletsForItem(
        itemIdRaw: string,
        latRaw: string,
        lngRaw: string,
        radiusKmRaw?: string,
        cursor?: string,
        limitRaw?: string,
    ): Promise<PaginatedOutletResult> {
        const itemId = parsePositiveId(itemIdRaw, "itemId");
        const lat = parseRequiredFloat(latRaw, "lat");
        const lng = parseRequiredFloat(lngRaw, "lng");
        const radiusKm = radiusKmRaw ? parseFloat(radiusKmRaw) : 10;
        const limit = limitRaw ? parseInt(limitRaw, 10) : 40;

        const { minLat, maxLat, minLng, maxLng } = this.getBoundingBox(lat, lng, radiusKm);

        const candidates = await this.prisma.outletItemSearchIndex.findMany({
            where: {
                itemId,
                outletLatitude: { gte: minLat, lte: maxLat },
                outletLongitude: { gte: minLng, lte: maxLng },
            },
            include: {
                Outlet: {
                    include: { OutletDeliveryConfig: true },
                },
                Item: true,
            },
        });

        if (candidates.length === 0) {
            return { outlets: [], nextCursor: null, hasMore: false };
        }

        const withDistance = candidates
            .map((c) => ({
                candidate: c,
                distance: this.haversineDistance(lat, lng, c.outletLatitude, c.outletLongitude),
            }))
            .filter((c) => c.distance <= radiusKm)
            .sort((a, b) => a.distance - b.distance);

        const cursorDistance = cursor ? parseFloat(cursor) : null;
        const startIndex = cursorDistance !== null
            ? withDistance.findIndex((c) => c.distance > cursorDistance)
            : 0;
        const effectiveStart = startIndex === -1 ? withDistance.length : startIndex;

        const page = withDistance.slice(effectiveStart, effectiveStart + limit);
        const hasMore = effectiveStart + limit < withDistance.length;
        const nextCursor = hasMore ? page[page.length - 1]?.distance.toString() ?? null : null;

        const outlets: NearestOutletResult[] = page.map(({ candidate, distance }) => ({
            outletId: candidate.outletId,
            name: candidate.Outlet.name,
            latitude: candidate.outletLatitude,
            longitude: candidate.outletLongitude,
            distance: Math.round(distance * 100) / 100,
            price: candidate.price,
            quantity: candidate.quantity,
            photo: candidate.Item.image,
            deliveryConfig: candidate.Outlet.OutletDeliveryConfig
                ? {
                    isDeliveryActive: candidate.Outlet.OutletDeliveryConfig.isDeliveryActive,
                    baseDeliveryFee: candidate.Outlet.OutletDeliveryConfig.baseDeliveryFee,
                }
                : null,
            operatingHours: candidate.Outlet.operatingHours ?? null,
        }));

        return { outlets, nextCursor, hasMore };
    }

    async getOutletItemDetail(outletIdRaw: string, itemIdRaw: string) {
        const outletId = parsePositiveId(outletIdRaw, "outletId");
        const itemId = parsePositiveId(itemIdRaw, "itemId");

        const outlet = await this.prisma.outlet.findUnique({
            where: { id: outletId },
            include: { OutletDeliveryConfig: true },
        });

        if (!outlet) {
            throw new BadRequestException({ error: "Outlet not found." });
        }

        const inventoryItem = await this.prisma.inventoryItems.findFirst({
            where: {
                itemId,
                Inventory: { outletId },
            },
            include: {
                Item: {
                    include: {
                        Media: { orderBy: { sortOrder: "asc" } },
                    },
                },
                InventoryItemUnit: true,
            },
        });

        if (!inventoryItem) {
            throw new BadRequestException({ error: "Item not found at this outlet." });
        }

        return {
            outlet: {
                outletId: outlet.id,
                name: outlet.name,
                bio: outlet.bio,
                bannerImage: outlet.bannerImage,
                operatingHours: outlet.operatingHours,
            },
            item: {
                itemId: inventoryItem.Item.id,
                inventoryItemId: inventoryItem.id, // NEW — needed for cart add (product_id = InventoryItems.id)
                name: inventoryItem.Item.name,
                description: inventoryItem.Item.description,
                price: inventoryItem.price,
                quantity: inventoryItem.quantity,
                photos: inventoryItem.Item.Media.map((m) => ({
                    url: m.url,
                    type: m.type,
                })),
                units: inventoryItem.InventoryItemUnit.map((u) => ({
                    id: u.id,
                    unitName: u.unitName,
                    unitLabel: u.unitLabel,
                    price: u.price,
                    quantity: u.quantity,
                    isDefault: u.isDefault,
                })),
            },
            deliveryConfig: outlet.OutletDeliveryConfig
                ? {
                    isDeliveryActive: outlet.OutletDeliveryConfig.isDeliveryActive,
                    baseDeliveryFee: outlet.OutletDeliveryConfig.baseDeliveryFee,
                    feePerKm: outlet.OutletDeliveryConfig.feePerKm,
                }
                : null,
        };
    }
}