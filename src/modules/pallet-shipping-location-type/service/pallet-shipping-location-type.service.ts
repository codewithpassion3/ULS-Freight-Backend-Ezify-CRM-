import { EntityManager } from "@mikro-orm/core";
import { Injectable, NotFoundException } from "@nestjs/common";
import { PalletShippingLocationType } from "src/entities/pallet-shipping-location-type.entity";
import { CreatePalletShippingLocationTypeDTO } from "../dto/create-pallet-shipping-location-type.dto";
import { UpdatePalletShippingLocationTypeDTO } from "../dto/update-pallet-shipping-location-type.dto";

@Injectable()
export class PalletShippingLocationTypeService {
    constructor(private readonly em: EntityManager) {}

    async getAll(){
        //1) Return all location types
        const palletShippingLocationTypes = await this.em.findAll(PalletShippingLocationType)

        //2) Return success response
        return {
            message: "Pallet shipping location types retrieved successfully",
            palletShippingLocationTypes
        }
    }

    async create(dto: CreatePalletShippingLocationTypeDTO){
        //1) Creta pallet shipping location type entity
        const palletShippingLocationType = this.em.create(PalletShippingLocationType, dto);

        //2) Persist changes
        await this.em.persist(palletShippingLocationType).flush();

        //3) Return success repsonse
        return {
            message: "Pallet shipping location type created successfully",
            palletShippingLocationType
        }
    }

    async update(dto: UpdatePalletShippingLocationTypeDTO, id: number){
        //1) Get the pallet shipping location type
        const palletShippingLocationType = await this.em.findOne(PalletShippingLocationType, { id });

        //2) Throw error for invalid pallet shipping location type
        if(!palletShippingLocationType){
            throw new NotFoundException("Invalid pallet shipping location type id")
        }

        //3) Update pallet shipping location type
        this.em.assign(palletShippingLocationType, dto, { ignoreUndefined: true });
        
        //4) Flush (persist) changes
        await this.em.flush();

        //5) Return updated signature
        return {
            message: "Pallet shipping location type updated successfully",
            PalletShippingLocationType
        };
    }

    async delete(id: number) {
        //1) Find signature
        const palletShippingLocationType = await this.em.findOne(PalletShippingLocationType, { id });
        
        //2) Throw error for invalid pallet shipping location type
        if (!palletShippingLocationType) {
            throw new NotFoundException("Invalid pallet shipping location type id");
        }
        
        //3) Remove signature and persist changes
        await this.em.remove(palletShippingLocationType).flush();

        //4) Return back success response
        return { message: "Pallet shipping location type deleted successfully" };
    }
}