import { Module } from "@nestjs/common";
import { AddressBookController } from "./controller/address-book.controller";
import { AddressBookService } from "./service/address-book.service";

@Module({
    controllers: [AddressBookController],
    providers: [AddressBookService]
})

export class AddressBookModule {}