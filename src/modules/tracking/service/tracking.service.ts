import { EntityManager } from "@mikro-orm/core";
import { BadRequestException, Injectable } from "@nestjs/common";
import { SessionData } from "express-session";
import { QuoteStatus } from "src/common/enum/quote-status";
import { Company } from "src/entities/company.entity";
import { Quote } from "src/entities/quote.entity";
import { PaginationParams } from "src/types/pagination";
import { buildQuery } from "src/utils/api-query";

@Injectable()
export class TrackingService {
    constructor(private readonly em: EntityManager) {}

   async getAllTrackingsAgainstCurrentUserCompany(session: SessionData, params: PaginationParams) {
    //1) Define fields allowed for search and filter by order
    const allowedFields = {
        quoteNumber: "quoteNumber",
        shipmentType: "shipmentType",
        status: "status",
        createdAt: "createdAt",
        trackingNumber: "shipment.trackingNumber",
        shipDate: "shipment.shipDate",
        carrier: "shipment.carrier",
    };

    //2) Pass query params and allowed field to build query pagination params
    const { search, page, limit, orderBy } = buildQuery(params, allowedFields);
    
    //3) Build filter for query
    const filter: any = { company: this.em.getReference(Company, session.companyId as number) };

    //4) ONLY quotes that have a shipment association
    filter.shipment = { $ne: null };

    //5) Handle status filter
    if (params?.status) {
        const normalized = params.status.toUpperCase();
        const validStatuses = Object.values(QuoteStatus);
        
        if (!validStatuses.includes(normalized as QuoteStatus)) {
            throw new BadRequestException(
                `Invalid status '${params.status}'. Allowed: ${validStatuses.join(', ')}`
            );
        }
        
        filter.status = normalized;
    }

    //6) Handle search (trackingNumber, address1/address2, billing reference codes)
    if (search) {
        filter.$or = [
            { shipment: { trackingNumber: { $ilike: `%${search}%` } } },
            { 
                addresses: { 
                    $some: { 
                        address: { 
                            $or: [
                                { address1: { $ilike: `%${search}%` } },
                                { address2: { $ilike: `%${search}%` } }
                            ]
                        } 
                    } 
                } 
            },
            { 
                shipment: { 
                    billingReferences: { 
                        $some: { 
                            code: { $ilike: `%${search}%` } 
                        } 
                    } 
                } 
            }
        ];
    }

    //7) Handle shipment type filter
    if (params.shipmentType) {
        filter.shipmentType = params.shipmentType;
    }

    //8) Handle Date range filter
    if (params.dateFrom || params.dateTo) {
        filter.createdAt = {};
        if (params.dateFrom) filter.createdAt.$gte = new Date(params.dateFrom);
        if (params.dateTo) filter.createdAt.$lte = new Date(params.dateTo);
    }

    //9) Handle Carrier filter (merged into existing shipment filter)
    if (params.carrier) {
        filter.shipment.carrier = params.carrier;
    }

    //10) Handle Ship Date Range filter (merged into existing shipment filter)
    if (params.shipDateFrom || params.shipDateTo) {
        filter.shipment.shipDate = {};
        if (params.shipDateFrom) filter.shipment.shipDate.$gte = new Date(params.shipDateFrom);
        if (params.shipDateTo) filter.shipment.shipDate.$lte = new Date(params.shipDateTo);
    }

    //11) Handle Origin Postal/ZIP filter (addresses where type === "TO")
    if (params.originPostalCode) {
        filter.addresses = filter.addresses || {};
        filter.addresses.$some = {
            type: "TO",
            address: {
                postalCode: { $ilike: `${params.originPostalCode}%` }
            }
        };
    }

    //12) Handle Destination Postal/ZIP filter (addresses where type === "FROM")
    if (params.destinationPostalCode) {
        filter.addresses = filter.addresses || {};
        if (filter.addresses.$some) {
            const originCondition = { ...filter.addresses };
            filter.addresses = {
                $and: [
                    originCondition,
                    {
                        $some: {
                            type: "FROM",
                            address: {
                                postalCode: { $ilike: `${params.destinationPostalCode}%` }
                            }
                        }
                    }
                ]
            };
        } else {
            filter.addresses.$some = {
                type: "FROM",
                address: {
                    postalCode: { $ilike: `${params.destinationPostalCode}%` }
                }
            };
        }
    }

    //13) Count total quotes and pages
    const total = await this.em.count(Quote, filter);
    const totalPages = Math.ceil(total / limit) || 1;

    //14) Clamp page based on total page and default page limit
    const clampedPage = Math.min(page, totalPages);
    const offset = (page - 1) * limit;

    //15) Fetch data with all requested relations
    const quotes = await this.em.find(
        Quote,
        filter,
        {
            limit,
            offset,
            orderBy: Object.entries(orderBy).map(([field, direction]) => ({ [field]: direction })),
            populate: [
                "addresses",
                "addresses.addressBookEntry",
                "addresses.address",
                "lineItems",
                "lineItems.units",
                "palletServices",
                "spotFtlServices",
                "spotLtlServices",
                "standardFTLService",
                "signature",
                "spotDetails",
                "shipment",
                "shipment.billingReferences"
            ]
        }
    );

    //16) Return success response
    return {
        message: "Trackings retrieved successfully",
        data: quotes,
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
}