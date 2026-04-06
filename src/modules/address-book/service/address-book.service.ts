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
import { buildQuery } from "src/utils/api-query";
import { Company } from "src/entities/company.entity";
import { SessionData } from "express-session";

@Injectable()
export class AddressBookService {
    constructor(private readonly em: EntityManager) {}

   async create(dto: CreateAddressBookDTO, currentUserId: number) {
        return this.em.transactional(async (em) => {
            //1) Extract fields
            const { signatureId, locationTypeId, address, ...restDTO } = dto;

            //2) Validate user
            const currentUser = em.getReference(User, currentUserId);
            
            const user = await em.findOne(User, { id: currentUserId }, { populate: ["company"], fields: ["id", "company.id"]});
            
            //3) Throw error for invalid user
            if (!user) throw new BadRequestException("Invalid user id");

            //4) Validate company against current user
            const currentUserCompany = em.getReference(Company, user.company.id);

            const companyCount = await em.count(Company, { id: user.company.id });

            //5) Throw error for invalid company id
            if (!companyCount) throw new BadRequestException("Invalid user company id");

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
                company: currentUserCompany
            }, { ignoreUndefined: true });

            em.persist(addressBook);

            //12) Flush entity manager changes
            await em.flush();

            //13) Return back success response
            return { message: "Contact added to address book successfully" };
        });
    }

    async getAllAgainstCurrentUserCompany(
        session: SessionData,
        params: Record<string, any>
    ) { 
        //1) Extact user and company id from session
        const userId = session.userId as number;
        const companyId = session.companyId as number;

        //2) Validate user
        const currentUser = this.em.getReference(User, userId);
        
        const user = await this.em.findOne(User, { id: userId}, { populate: ["company"], fields: ["id", "company.id"]});
        
        //3) Throw error for invalid user
        if (!user) throw new BadRequestException("Invalid user id");

        //4) Validate company against current user
        const currentUserCompany = this.em.getReference(Company, companyId);

        const companyCount = await this.em.count(Company, { id: companyId });

        //5) Throw error for invalid company id
        if (!companyCount) throw new BadRequestException("Invalid user company id");
    
        //6) Specify fields allowed for search and filters
        const allowedFields: Record<string, string> = {
            phoneNumber: "phoneNumber",
            companyName: "companyName",
            contactId: "id",
            // address: "address.city" // works if MikroORM can resolve it
        };

        //7) Pass query params and allowed field to build query pagination params
        const { search, page, limit, orderBy } = buildQuery(params, allowedFields);

        //8) Build filter query
        const filter: any = { createdBy: currentUser, company: currentUserCompany };

        //9) Handle search filter
        if (search) {
            filter.companyName = { $ilike: `${search}%` };
            console.log("search", search, filter)
        }

        //10) Count total address books and pages
        const total = await this.em.count(AddressBook, filter);
        const totalPages = Math.ceil(total / limit) || 1;

        //11) Clamp page based on default limit and total address book pages\
        const clampedPage = Math.min(page, totalPages);
        const offset = (clampedPage - 1) * limit;

        //12) Fetch data
        let addressBook = await this.em.find(
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
                    "locationType",
                    "defaultInstructions",
                    "email",
                    "locationType",
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

        const result = addressBook.map(item => plainToInstance(AddressBookResponseDto, item, {
                            excludeExtraneousValues: true,
                        })
                    );
        //13) Return success response
        return {
            message: "Address book contacts retrieved successfully",
            data: result,
            meta: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage: clampedPage < totalPages,
                hasPrevPage: clampedPage > 1,
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
        //1) Validate payload
        const hasValidField = Object.values(dto).some(
            (value) => value !== undefined && value !== null && value !== ""
        );

        if (!hasValidField) {
            throw new BadRequestException("Provide at least one valid field to update");
        }

        //2) Extract nested / relation fields
        const { signatureId, locationTypeId, address, ...restDTO } = dto;

        let signatureRef: any = null;
        let locationTypeRef: any = null;

        //3) Validate Signature
        if (signatureId !== undefined) {
            const signature = await this.em.findOne(Signature, { id: signatureId });

            if (!signature) {
                throw new NotFoundException("Invalid signature id");
            }

            signatureRef = this.em.getReference(Signature, signatureId);
        }

        //4) Validate Location Type
        if (locationTypeId !== undefined) {
            const locationType = await this.em.findOne(PalletShippingLocationType, {
                id: locationTypeId,
            });

            if (!locationType) {
                throw new NotFoundException("Invalid location type id");
            }

            locationTypeRef = this.em.getReference(
                PalletShippingLocationType,
                locationTypeId
            );
        }

        //5) Get user reference
        const userRef = this.em.getReference(User, currentUserId);

        //6) Fetch AddressBook with address populated
        const addressBookContent = await this.em.findOne(
            AddressBook,
            {
                id: addressBookContactId,
                createdBy: userRef,
            },
            {
                populate: ["address"],
            }
        );

        if (!addressBookContent) {
            throw new NotFoundException(
                "Address book contact not found or access denied."
            );
        }

        //7) Build update payload (ONLY entity-safe fields)
        const updatePayload: Partial<AddressBook> = {
            ...restDTO,
            updatedBy: userRef,
        };

        if (signatureRef) {
            updatePayload.signature = signatureRef;
        }

        if (locationTypeRef) {
            updatePayload.locationType = locationTypeRef;
        }

        //8) Assign AddressBook fields
        this.em.assign(addressBookContent, updatePayload, {
            ignoreUndefined: true,
        });

        //9) Handle Address safely
        if (address) {
            this.em.assign(addressBookContent.address, address, {
                ignoreUndefined: true,
            });
        }

        //10) Flush changes
        await this.em.flush();

        //11) Return back success response
        return {
            message: "Contact details updated successfully",
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

        //2) Use buildQuery for pagination (no allowedFields needed)
        const { page, limit } = buildQuery(queryParams, {});
        const offset = (page - 1) * limit;
        
        //3) Fetch paginated data
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

        //4) Return response
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