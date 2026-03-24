import { EntityManager, wrap } from "@mikro-orm/core";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateAddressBookDTO} from "../dto/create-address-book.dto";
import { User } from "src/entities/user.entity";
import { PalletShippingLocationType } from "src/entities/pallet-shipping-location-type.entity";
import { Signature } from "src/entities/signature.entity";
import { Address } from "src/entities/address.entity";
import { AddressBook } from "src/entities/address-book.entity";
import { GetAllAgainstCurrentUserQueryParams } from "../controller/address-book.controller";
import { UserAddressBookUsage } from "src/entities/user-address-book-usage.entity";
import { UpdateAddressBook } from "../dto/update-address-book.dto";
import { plainToInstance } from "class-transformer";
import { AddressBookResponseDto } from "../dto/address-book.dto";

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
        const filter: any = { createdBy: this.em.getReference(User, currentUserId) };

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
                populate: ["address"],
                fields: [
                    "companyName",
                    "contactId", 
                    "contactName",
                    "phoneNumber",
                    "defaultInstructions",
                    "email",
                    "address.address1",
                    "address.address2",
                    "address.postalCode",
                    "address.unit",
                    "address.city",
                    "address.state",
                    "address.country"
                ],
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

    async getSingleAgainstCurrentUser(currentUserId: number, addressBookContactId: number){
        //1) Fetch contact from address book against current user
        const userEntity = this.em.getReference(User, currentUserId)

        const addressBookContent = await this.em.findOne(AddressBook, { id: addressBookContactId, createdBy: userEntity }, {
            populate: ["address"],
            fields: [
                "companyName",
                "contactId", 
                "contactName",
                "phoneNumber",
                "isResidential",
                "signature",
                "locationType",
                "palletShippingReadyTime",
                "palletShippingCloseTime",
                "defaultInstructions",
                "email",
                "address.address1",
                "address.address2",
                "address.postalCode",
                "address.unit",
                "address.city",
                "address.state",
                "address.country"
            ],
        });

        //2) Throw error for invalid address book contact
        if (!addressBookContent) {
            throw new NotFoundException(
                "Address book contact not found or you are not allowed to access this resource."
            );
        }

        //3) Return back success response 
         return {
            message: "Contact successfully retrieved from address book",
            addressBookContact: plainToInstance(AddressBookResponseDto, addressBookContent, {
                excludeExtraneousValues: true,
            }),
            };
    }

   async updateSingleAgainstCurrentUser(
        currentUserId: number,
        addressBookContactId: number,
        dto: UpdateAddressBook
    ) {
        //1) Check for empty payload
        const hasValidField = Object.values(dto).some(
        (value) => value !== undefined && value !== null && value !== ""
        );

        //2) Throw error for empty payload
        if (!hasValidField) {
        throw new BadRequestException("Provide at least one valid field to update");
        }

        //3) Extract fields from dto
        const {
            address1,
            address2,
            unit,
            state,
            country,
            postalCode,
            city,
            signatureId,
            locationTypeId,
            ...restDTO
        } = dto;

        //4) Define signature and pallet shipping location type variables
        let signature: Signature | null = null;
        let palletShippingLocationType: PalletShippingLocationType | null = null;

        //5) Check for valid signature entity only if signatureId is present
        if(signatureId !== undefined){

            signature = await this.em.findOne(Signature, { id: signatureId });
            
            //6) Throw error for invalid signatrue id
            if(!signature){
                throw new NotFoundException("Invalid signature id")
            }
        }

        //7) Validate location type id 
        if(locationTypeId !== undefined){
            palletShippingLocationType = await this.em.findOne(PalletShippingLocationType, { id: locationTypeId });
            
            //8) Throw error for invalid pallet shipping location type id
            if(!palletShippingLocationType){
                throw new NotFoundException("Invalid location type id");
            }
        }


        //9) Get reference to user
        const userEntity = this.em.getReference(User, currentUserId);

        //10) Fetch address book with address
        const addressBookContent = await this.em.findOne(
            AddressBook,
            {
                id: addressBookContactId,
                createdBy: userEntity,
            },
            {
                populate: ["address"],
            }
        );

        //11) Throw error for invalid address book content
        if (!addressBookContent) {
            throw new NotFoundException(
                "Address book contact not found or you are not allowed to access this resource."
            );
        }

        //12) Update AddressBook fields
        const fieldsToUpdateForAddressBook = {
            ...restDTO,
            updatedBy: userEntity,
        }

        //13) Update signature and location type in address book if present
        if(signature) fieldsToUpdateForAddressBook["signature"] = signature;
        if(palletShippingLocationType) fieldsToUpdateForAddressBook["locationType"] = palletShippingLocationType;
        
        //14) Update address book entity
        this.em.assign(addressBookContent, fieldsToUpdateForAddressBook, {
            ignoreUndefined: true,
        });

        //15) Update address fields
        this.em.assign(addressBookContent.address, {
            address1,
            address2,
            unit,
            state,
            country,
            postalCode,
            city,
        }, {
            ignoreUndefined: true,
        });

        //16) MikroORM will track changes automatically
        await this.em.flush();

        //17) Return back success response
        return {
            message: "Contact details updated successfully"
        };
    }

    async deleteSingleAgainstCurrentUser(
        currentUserId: number,
        addressBookContactId: number
    ) {
        return this.em.transactional(async (em) => {
            //1) Get user reference
            const user = em.getReference(User, currentUserId);

            //2) Validate address book exists
            const addressBook = await em.findOne(AddressBook, {
                id: addressBookContactId,
                createdBy: user
            }, { populate: ['userUsages'] });

            //3) Throw if not found or unauthorized
            if (!addressBook) {
                throw new NotFoundException(
                    "Address book not found or you are not allowed to access this resource."
                );
            }

            //4) Delete the parent entity
            await em.remove(addressBook).flush();

            //5) Return success
            return {
                message: "Address book contact deleted successfully"
            };
        });
    }

    async markAsRecentAgainstCurrentUser(
        currentUserId: number,
        addressBookContactId: number
    ) {
        //1) Get contact from address book 
        const currentUser = this.em.getReference(User, currentUserId);

        const addressBookContent = await this.em.findOne(AddressBook, { id: addressBookContactId, createdBy: currentUser });

        //2) Throw error for invalid address book id
        if (!addressBookContent) {
            throw new NotFoundException(
                "Address book contact not found or you are not allowed to access this resource."
            );
        }

        //3) Check if address is already being used before
        const existing = await this.em.findOne(UserAddressBookUsage, {
            user: currentUserId,
            addressBook: addressBookContactId
        });

        //4) If already used before update lastUsedAt field
        if (existing) {
            existing.lastUsedAt = new Date();
            await this.em.flush();
            return { message: "Contact is already marked as recent in address book"};
        }

        //5) Create new entry in user address book usage
        const addressBookUsage = this.em.create(UserAddressBookUsage, {
            user: currentUser,
            addressBook: addressBookContent
        });

        //6) Persist changes
        await this.em.persist(addressBookUsage).flush();

        //7) Return back success response
        return {
            message: "Contact successfully marked as recent in address book"
        };
    }

    async getAllrecentAgainstCurrentUser(
        currentUserId: number,
        queryParams: Record<keyof Partial<GetAllAgainstCurrentUserQueryParams>, any>
    ) {
        //1) Get user reference
        const currentUser = this.em.getReference(User, currentUserId);

        //2) Extract and sanitize query params
        let page = Number(queryParams.page) || 1;
        let limit = Number(queryParams.limit) || 10;

        //3) Safety guards
        page = Math.max(page, 1);
        limit = Math.min(Math.max(limit, 1), 50);

        const offset = (page - 1) * limit;

        //4) Fetch paginated data
        const [recentContacts, total] = await this.em.findAndCount(
            UserAddressBookUsage,
            { user: currentUser },
            {
                populate: ["addressBook","addressBook.address"],
                fields: [
                    "addressBook.companyName",
                    "addressBook.contactId", 
                    "addressBook.contactName",
                    "addressBook.phoneNumber",
                    "addressBook.defaultInstructions",
                    "addressBook.email",
                    "addressBook.address.address1",
                    "addressBook.address.address2",
                    "addressBook.address.postalCode",
                    "addressBook.address.unit",
                    "addressBook.address.city",
                    "addressBook.address.state",
                    "addressBook.address.country"
                ],
                orderBy: {
                    lastUsedAt: "DESC"
                },
                limit,
                offset
            }
        );

        //5) Return response
        return {
            message: "Recent contacts retrieved successfully",
            data: recentContacts,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}