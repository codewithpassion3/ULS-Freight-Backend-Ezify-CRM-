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
import { SessionData } from "express-session";
import { RequestContextService } from "src/utils/request-context-service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotificationType } from "src/common/enum/notification-type.enum";
import { EntityEventPayload } from "src/types/notification";
import { RecentContactDto } from "../dto/recent-contact.dto";

@Injectable()
export class AddressBookService {
    constructor(private readonly em: EntityManager, 
        private readonly requestContextService: RequestContextService,
        private readonly eventEmitter: EventEmitter2
    ) {}

   async create(dto: CreateAddressBookDTO, session: SessionData) {
        return this.em.transactional(async (em) => {
            //1) Extract fields
            const { signatureId, locationTypeId, address, ...restDTO } = dto;

            //2) Validate session details
            const ctx = await this.requestContextService.resolve({ session, em })

            //3) Validate location type
            const locationType = await em.findOne(
                PalletShippingLocationType, 
                { id: locationTypeId }, 
                { fields: ["id"] }
            );

            //4) Throw error for invalid location type
            if (!locationType) throw new BadRequestException("Invalid location type id");

            //5) Validate signature
            const signature = await em.findOne(
                Signature, 
                { id: signatureId }, 
                { fields: ["id"] }
            );

            //6) Throw error for invalid signature
            if (!signature) throw new BadRequestException("Invalid signature id");


            //7) Create address
            const addressEntity = new Address();
            
            //8) Update address book entity and persist address
            wrap(addressEntity).assign(address, { ignoreUndefined: true });
            
            //9) Persist changes
            em.persist(addressEntity);

            //10) Create address book entry
            const addressBook = new AddressBook();
            
            //11) Update address book entity and persist changes
            wrap(addressBook).assign({
                ...restDTO,
                address: addressEntity,
                locationType,
                signature,
                createdBy: ctx.user,
                company: ctx.company
            }, { ignoreUndefined: true });

            em.persist(addressBook);

            //12) Flush entity manager changes
            await em.flush();

            //13) Send out notification to all members of company
            this.eventEmitter.emit(NotificationType.ADDRESSBOOK_CREATED, {
                entity: addressBook.id,
                actorId: session.userId,
                companyId: session.companyId,
                metadata: {
                    addressBookCompanyName: addressBook.companyName,
                    locationType: addressBook.locationType,
                    location: addressBook.address.city + ', ' + addressBook.address.country
                }
            } as EntityEventPayload<any>);

            //14) Return back success response
            return { message: "Contact added to address book successfully" };
        });
    }

    async getAllAgainstCurrentUserCompany(
        session: SessionData,
        params: Record<string, any>
    ) { 
        //1) Validate session details
        const ctx = await this.requestContextService.resolve({ session, em: this.em})
        
        //2) Specify fields allowed for search and filters
        const allowedFields: Record<string, string> = {
            phoneNumber: "phoneNumber",
            companyName: "companyName",
            contactId: "id",
            // address: "address.city" // works if MikroORM can resolve it
        };

        //3) Pass query params and allowed field to build query pagination params
        const { search, page, limit, orderBy } = buildQuery(params, allowedFields);

        //4) Build filter query
        const filter: any = { company: ctx.company };

        //5) Handle search filter
        if (search) {
            filter.companyName = { $ilike: `${search}%` };
        }

        //6) Count total address books and pages
        const total = await this.em.count(AddressBook, filter);
        const totalPages = Math.ceil(total / limit) || 1;

        //7) Clamp page based on default limit and total address book pages\
        const clampedPage = Math.min(page, totalPages);
        const offset = (clampedPage - 1) * limit;

        //8) Fetch data
        let addressBook = await this.em.find(
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

        //9) Transform response fields according to DTO
        const result = addressBook.map(item => plainToInstance(AddressBookResponseDto, item, {
                            excludeExtraneousValues: true,
                        })
                    );

        //10) Return success response
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

    async getSingleAgainstCurrentUserCompany(session: SessionData, addressBookContactId: number){
        //1) Validate session details
        const ctx = await this.requestContextService.resolve({session, em: this.em})
     
        //2) Get address book against session details
        const addressBookContent = await this.em.findOne(AddressBook, { id: addressBookContactId, company: ctx.company }, {
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

        //3) Throw error for invalid address book contact
        if (!addressBookContent) {
            throw new NotFoundException(
                "Address book contact not found or you are not allowed to access this resource."
            );
        }

        //4) Return back success response 
         return {
            message: "Contact successfully retrieved from address book",
            addressBookContact: plainToInstance(AddressBookResponseDto, addressBookContent, {
                excludeExtraneousValues: true,
            }),
        };
    }

    async updateSingleAgainstCurrentUserCompany(
        session: SessionData,
        addressBookContactId: number,
        dto: UpdateAddressBook
    ) {
        //1) Validate session data
        const ctx = await this.requestContextService.resolve({ session, em: this.em });

        //2) Validate payload
        const hasValidField = Object.values(dto).some(
            (value) => value !== undefined && value !== null && value !== ""
        );

        if (!hasValidField) {
            throw new BadRequestException("Provide at least one valid field to update");
        }

        //3) Extract nested / relation fields
        const { signatureId, locationTypeId, address, ...restDTO } = dto;

        let signatureRef: any = null;
        let locationTypeRef: any = null;

        //4) Validate Signature
        if (signatureId !== undefined) {
            const signature = await this.em.findOne(Signature, { id: signatureId });

            if (!signature) {
                throw new NotFoundException("Invalid signature id");
            }

            signatureRef = this.em.getReference(Signature, signatureId);
        }

        //5) Validate Location Type
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


        //6) Fetch AddressBook with address populated
        const addressBookContent = await this.em.findOne(
            AddressBook,
            {
                id: addressBookContactId,
                company: ctx.company
            },
            {
                populate: ["address"],
            }
        );

        if (!addressBookContent) {
            throw new NotFoundException(
                "Address book contact not found or you don't have the required permissions"
            );
        }

        //7) Build update payload (ONLY entity-safe fields)
        const updatePayload: Partial<AddressBook> = {
            ...restDTO,
            updatedBy: ctx.user,
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

        //11) Send out notification to all members of company
        this.eventEmitter.emit(NotificationType.ADDRESSBOOK_UPDATED, {
            entity: addressBookContent,
            actorId: session.userId,
            companyId: session.companyId,
            metadata: {
                changedFields: Object.keys(dto),
                addressBookCompanyName: addressBookContent.companyName,
                locationType: addressBookContent.locationType,
                location: addressBookContent.address.city + ', ' + addressBookContent.address.country
            }
        } as EntityEventPayload<AddressBook>);

        //12) Return back success response
        return {
            message: "Contact details updated successfully",
        };
    }

    async deleteSingleAgainstCurrentUserCompany(
        session: SessionData,
        addressBookContactId: number
    ) {
        return this.em.transactional(async (em) => {
            //1) Validate session details
            const ctx = await this.requestContextService.resolve({ session, em: em })

            //2) Validate address book exists
            const addressBook = await em.findOne(AddressBook, {
                id: addressBookContactId,
                company: ctx.company
            }, { populate: ['userUsages'] });

            //3) Throw if not found or unauthorized
            if (!addressBook) {
                throw new NotFoundException(
                    "Address book not found or you are not allowed to access this resource."
                );
            }

            //4) Delete the parent entity
            await em.remove(addressBook).flush();

            this.eventEmitter.emit(NotificationType.ADDRESSBOOK_DELETED, {
                entity: addressBook,
                actorId: session.userId,
                companyId: session.companyId,
                metadata: {
                    id: addressBook.id
                }
            } as EntityEventPayload<AddressBook>);

            //5) Return success
            return {
                message: "Address book contact deleted successfully"
            };
        });
    }

    async markAsRecentAgainstCurrentUserCompany(
        session: SessionData,
        addressBookContactId: number
    ) {
       //1) Validate session details
        const ctx = await this.requestContextService.resolve({ session, em: this.em })

        const addressBookContent = await this.em.findOne(AddressBook, { id: addressBookContactId, company: ctx.company });

        //2) Throw error for invalid address book id
        if (!addressBookContent) {
            throw new NotFoundException(
                "Address book contact not found or you are not allowed to access this resource."
            );
        }

        //3) Check if address is already being used before
        const existing = await this.em.findOne(UserAddressBookUsage, {
            user: ctx.user,
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
            user: ctx.user,
            addressBook: addressBookContent
        });

        //6) Persist changes
        await this.em.persist(addressBookUsage).flush();

        //7) Return back success response
        return {
            message: "Contact successfully marked as recent in address book"
        };
    }

    async getAllrecentAgainstCurrentUserCompany(
        session: SessionData,
        queryParams: Record<keyof Partial<GetAllAgainstCurrentUserQueryParams>, any>
    ) {
        //1) Validate session details
        const ctx = await this.requestContextService.resolve({ session, em: this.em })
       
        //2) Use buildQuery for pagination (no allowedFields needed)
        const { page, limit } = buildQuery(queryParams, {});
        const offset = (page - 1) * limit;
        
        //3) Fetch paginated data
        const [recentContacts, total] = await this.em.findAndCount(
            UserAddressBookUsage,
            { 
              addressBook: {
                    company: ctx.company
                }
            },
            
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

        //4) Transform addressBook object in response
        const transformedContacts = plainToInstance(RecentContactDto, recentContacts, {
            excludeExtraneousValues: true
        });  

        //5) Return response
        return {
            message: "Recent contacts retrieved successfully",
            data: transformedContacts,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}