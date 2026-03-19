import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { AddressBookService } from "../service/address-book.service";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { CreateAddressBookDTO } from "../dto/create-addres-book.dto";
import { CurrentUser } from "src/decorators/currentUser.decorator";

@Controller("address-book")
export class AddressBookController {
    constructor(private readonly addressBookService: AddressBookService) {}

    @UseGuards(SessionAuthGuard)
    @Post("/")
    async Create(@Body() dto: CreateAddressBookDTO, @CurrentUser() currentUserId: number){
        return this.addressBookService.create(dto, currentUserId);
    }
}