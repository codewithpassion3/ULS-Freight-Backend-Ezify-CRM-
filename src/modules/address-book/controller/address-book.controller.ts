import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Session, UseGuards } from "@nestjs/common";
import { AddressBookService } from "../service/address-book.service";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { CreateAddressBookDTO } from "../dto/create-address-book.dto";
import { CurrentUser } from "src/decorators/currentUser.decorator";
import { UpdateAddressBook } from "../dto/update-address-book.dto";
import type { SessionData } from "express-session";

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
    async Create(@Body() dto: CreateAddressBookDTO, @Session() session: SessionData){
        return this.addressBookService.create(dto, session);
    }

    @UseGuards(SessionAuthGuard)
    @Get("/")
    async GetAllAgainstCurrentUserCompany(@Session() session: SessionData, @Query() queryParams: Record<keyof GetAllAgainstCurrentUserQueryParams, any>){
        return this.addressBookService.getAllAgainstCurrentUserCompany(session, queryParams);
    }

    @UseGuards(SessionAuthGuard)
    @Post("/:id/recent")
    async MarkAsRecentAgainstCurrentUser(@Session() session: SessionData, @Param("id") addressBookContactId: number){
        return this.addressBookService.markAsRecentAgainstCurrentUserCompany(session, addressBookContactId);
    }

    @UseGuards(SessionAuthGuard)
    @Get("/recent")
    async GetAllRecentAgainstCurrentUser(@Session() session: SessionData, @Query() queryParams: Record<keyof Partial<GetAllAgainstCurrentUserQueryParams>, any>){
        return this.addressBookService.getAllrecentAgainstCurrentUserCompany(session, queryParams);
    }

    @UseGuards(SessionAuthGuard)
    @Get("/:id")
    async GetSingleAgainstCurrentUserCompany(@Session() session: SessionData, @Param("id") addressBookContactId: number){
        return this.addressBookService.getSingleAgainstCurrentUserCompany(session, addressBookContactId);
    }

    @UseGuards(SessionAuthGuard)
    @Patch("/:id")
    async UpdateSingleAgainstCurrentUser(@Session() session: SessionData, @Param("id") addressBookContactId: number, @Body() dto: UpdateAddressBook){
        return this.addressBookService.updateSingleAgainstCurrentUserCompany(session, addressBookContactId, dto);
    }

    @UseGuards(SessionAuthGuard)
    @Delete("/:id")
    async DeleteSingleAgainstCurrentUserCompany(@Session() session: SessionData, @Param("id") addressBookContactId: number) {
        return this.addressBookService.deleteSingleAgainstCurrentUserCompany(session, addressBookContactId);
    }


}