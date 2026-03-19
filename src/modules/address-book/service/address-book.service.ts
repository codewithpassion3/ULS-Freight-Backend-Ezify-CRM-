import { EntityManager, wrap } from "@mikro-orm/core";
import { BadRequestException, Injectable } from "@nestjs/common";
import { CreateAddressBookDTO} from "../dto/create-addres-book.dto";
import { User } from "src/entities/user.entity";
import { PalletShippingLocationType } from "src/entities/pallet-shipping-location-type.entity";
import { Signature } from "src/entities/signature.entity";
import { Address } from "src/entities/address.entity";
import { AddressBook } from "src/entities/address-book.entity";
import { GetAllAgainstCurrentUserQueryParams } from "../controller/address-book.controller";

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
                Signature, 
                { id: signatureId }, 
                { fields: ["id"] }
            );

            //7) Throw error for invalid signature
            if (!signature) throw new BadRequestException("Invalid signature id");


            //8) Create address
            const addressEntity = new Address();
            
            //9) Update address book entity and persist address
            wrap(addressEntity).assign(address, { ignoreUndefined: true });
        
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
            }, { ignoreUndefined: true });

            em.persist(addressBook);

            //12) Flush entity manager changes
            await em.flush();

            //13) Return back success response
            return { message: "Contact added to address book successfully" };
        });
    }

    async getAllAgainstCurrentUser(
        currentUserId: number,
        params: Record<string, any>
    ) {
        //1) Parse params
        const search = params.search?.trim() || "";
        const requestedPage = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) > 0 ? parseInt(params.limit) : 10;

        //2) Multi-sort param
        const sortParam = params.sort || "createdAt:desc";

        //3) Allowed fields (API → DB mapping)
        const allowedFields: Record<string, string> = {
            phoneNumber: "phoneNumber",
            companyName: "companyName",
            contactId: "id",
            // address: "address.city" // works if MikroORM can resolve it
        };

        //4) Prepare sort fields
        const orderBy: Record<string, any> = {};

        const sortParts = sortParam.split(",");

        for (const part of sortParts) {
            const [field, directionRaw] = part.split(":");

            if (!allowedFields[field]) continue;

            const direction =
                (directionRaw || "asc").toLowerCase() === "asc" ? "ASC" : "DESC";

            const mappedField = allowedFields[field];

            orderBy[mappedField] = direction;
        }

        //5) Fallback
        if (Object.keys(orderBy).length === 0) {
            orderBy.createdAt = "DESC";
        }

        //6) Build filter
        const filter: any = { createdBy: currentUserId };

        if (search) {
            filter.companyName = { $ilike: `${search}%` };
        }

        //7) Count total
        const total = await this.em.count(AddressBook, filter);

        const totalPages = Math.ceil(total / limit) || 1;

        //8) Clamp page
        const page = Math.min(requestedPage, totalPages);
        const offset = (page - 1) * limit;

        //9) Fetch data (multi-sort supported here)
        const addressBook = await this.em.find(
            AddressBook,
            filter,
            {
                limit,
                offset,
                orderBy: Object.entries(orderBy).map(([field, direction]) => ({
                    [field]: direction
                })),
                populate: ["address"]
            }
        );

        //10) Response
        return {
            message: "Address book contacts retrieved successfully",
            data: addressBook,
            meta: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                sort: orderBy
            }
        };
    }
}