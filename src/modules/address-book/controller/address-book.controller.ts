import { Body, Controller, Get, Param, Patch, Post, Query, Session, UseGuards } from "@nestjs/common";
import { AddressBookService } from "../service/address-book.service";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { CreateAddressBookDTO } from "../dto/create-address-book.dto";
import { CurrentUser } from "src/decorators/currentUser.decorator";
import { UpdateAddressBook } from "../dto/update-address-book.dto";

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
    @Get("/:id")
    async GetSingleAgainstCurrentUser(@CurrentUser() currentUserId: number, @Param("id") addressBookContactId: number){
        return this.addressBookService.getSingleAgainstCurrentUser(currentUserId, addressBookContactId);
    }

    @UseGuards(SessionAuthGuard)
    @Patch("/:id")
    async UpdateSingleAgainstCurrentUser(@CurrentUser() currentUserId: number, @Param("id") addressBookContactId: number, @Body() dto: UpdateAddressBook){
        return this.addressBookService.updateSingleAgainstCurrentUser(currentUserId, addressBookContactId, dto);
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