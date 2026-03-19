import { Body, Controller, Get, Param, Post, Query, Session, UseGuards } from "@nestjs/common";
import { AddressBookService } from "../service/address-book.service";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { CreateAddressBookDTO } from "../dto/create-addres-book.dto";
import { CurrentUser } from "src/decorators/currentUser.decorator";

export interface GetAllAgainstCurrentUserQueryParams {
    page?: number;
    limit?: number;
    search?: number;
}

@Controller("address-book")
export class AddressBookController {
    constructor(private readonly addressBookService: AddressBookService) {}

    @UseGuards(SessionAuthGuard)
    @Post("/")
    async Create(@Body() dto: CreateAddressBookDTO, @CurrentUser() currentUserId: number){
        return this.addressBookService.create(dto, currentUserId);
    }

    @UseGuards(SessionAuthGuard)
    @Get("/")
    async GetAllAgainstCurrentUser(@CurrentUser() currentUserId: number, @Query() queryParams: Record<keyof GetAllAgainstCurrentUserQueryParams, any>){
        return this.addressBookService.getAllAgainstCurrentUser(currentUserId, queryParams);
    }

    @UseGuards(SessionAuthGuard)
    @Post("/:id/recent")
    async MarkAsRecentAgainstCurrentUser(@CurrentUser() currentUserId: number, @Param("id") addressBookContactId: number){
        return this.addressBookService.markAsRecentAgainstCurrentUser(currentUserId, addressBookContactId);
    }

    @UseGuards(SessionAuthGuard)
    @Get("/recent")
    async GetAllRecentAgainstCurrentUser(@CurrentUser() currentUserId: number, @Query() queryParams: Record<keyof Partial<GetAllAgainstCurrentUserQueryParams>, any>){
        return this.addressBookService.getAllrecentAgainstCurrentUser(currentUserId, queryParams);
    }

}