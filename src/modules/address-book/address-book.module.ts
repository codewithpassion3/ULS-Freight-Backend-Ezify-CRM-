import { Module } from "@nestjs/common";
import { AddressBookController } from "./controller/address-book.controller";
import { AddressBookService } from "./service/address-book.service";
import { RequestContextService } from "src/utils/request-context-service";

@Module({
    controllers: [AddressBookController],
    providers: [AddressBookService,RequestContextService],
})

export class AddressBookModule {}