import { Controller, Get, Headers, Query } from "@nestjs/common";
import { SearchService } from "../services/search.service";

@Controller()
export class SearchController {
    constructor(private readonly searchService: SearchService) { }

    @Get("search/items")
    searchItems(
        @Query("keyword") keyword?: string,
        @Query("lat") lat?: string,
        @Query("lng") lng?: string,
        @Query("limit") limit?: string,
        @Query("offset") offset?: string
    ) {
        return this.searchService.searchItems(keyword, lat, lng, limit, offset);
    }

    @Get("search/suggestions")
    searchSuggestions(
        @Headers("authorization") authorization: string | undefined,
        @Query("keyword") keyword?: string,
        @Query("lat") lat?: string,
        @Query("lng") lng?: string
    ) {
        return this.searchService.searchSuggestions(authorization, keyword, lat, lng);
    }
}