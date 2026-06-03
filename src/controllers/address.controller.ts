import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from "@nestjs/common";
import { parsePositiveId } from "../common/validation";
import { AddressService } from "../services/address.service";

@Controller()
export class AddressController {
  constructor(private readonly addressesService: AddressService) {}

  @Get("addresses")
  addresses(@Headers("authorization") authorization?: string) {
    return this.addressesService.addresses(authorization);
  }

  @Post("addresses")
  createAddress(@Headers("authorization") authorization: string | undefined, @Body() body: unknown) {
    return this.addressesService.createAddress(authorization, body);
  }

  @Patch("addresses/:id")
  updateAddress(@Headers("authorization") authorization: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    return this.addressesService.updateAddress(authorization, parsePositiveId(id), body);
  }

  @Delete("addresses/:id")
  deleteAddress(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    return this.addressesService.deleteAddress(authorization, parsePositiveId(id));
  }
}
