import { Controller, Get, Query } from "@nestjs/common";
import { OutletService } from "../services/outlet.service";

@Controller()
export class OutletController {
    constructor(private readonly outletService: OutletService) { }

    @Get("outlets/nearest")
    getNearestOutletsForItem(
        @Query("itemId") itemId: string,
        @Query("lat") lat: string,
        @Query("lng") lng: string,
        @Query("radiusKm") radiusKm?: string,
        @Query("cursor") cursor?: string,
        @Query("limit") limit?: string
    ) {
        return this.outletService.getNearestOutletsForItem(itemId, lat, lng, radiusKm, cursor, limit);
    }
}