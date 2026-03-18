import { EntityManager, wrap } from "@mikro-orm/core";
import { BadRequestException, Injectable } from "@nestjs/common";
import { CreateAddressBookDTO} from "../dto/create-addres-book.dto";
import { User } from "src/entities/user.entity";
import { PalletShippingLocationType } from "src/entities/pallet-shipping-location-type";
import { Signatrue } from "src/entities/signature.entity";
import { Address } from "src/entities/address.entity";
import { AddressBook } from "src/entities/address-book.entity";

@Injectable()
export class AddressBookService {
    constructor(private readonly em: EntityManager) {}

   async create(dto: CreateAddressBookDTO, currentUserId: number) {
    return this.em.transactional(async (em) => {
        //1) Extract fields
        const { signatureId, locationTypeId, address, ...restDTO } = dto;

        //2) Validate user
        const currentUser = em.getReference(User, currentUserId);
        
        const userExists = await em.count(User, { id: currentUserId });
        
        //3) Throw error for invalid user
        if (!userExists) throw new BadRequestException("Invalid user id");

        //4) Validate location type
        const locationType = await em.findOne(
            PalletShippingLocationType, 
            { id: locationTypeId }, 
            { fields: ["id"] }
        );

        //5) Throw error for invalid location type
        if (!locationType) throw new BadRequestException("Invalid location type id");

        //6) Validate signature
        const signature = await em.findOne(
            Signatrue, 
            { id: signatureId }, 
            { fields: ["id"] }
        );

        //7) Throw error for invalid signature
        if (!signature) throw new BadRequestException("Invalid signature id");


        //8) Create address
        const addressEntity = new Address();
        
        //9) Update address book entity and persist address
        wrap(addressEntity).assign(address);
     
        em.persist(addressEntity);

        //10) Create address book entry
        const addressBook = new AddressBook();
        
        //11) Update address book entity and persist changes
        wrap(addressBook).assign({
            ...restDTO,
            address: addressEntity,
            locationType,
            signature,
            createdBy: currentUser,
        });

        em.persist(addressBook);

        //12) Flush entity manager changes
        await em.flush();

        //13) Return back success response
        return { message: "Contact added to address book successfully" };
    });
}
}