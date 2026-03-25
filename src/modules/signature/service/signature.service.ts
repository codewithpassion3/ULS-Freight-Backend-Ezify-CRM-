import { EntityManager } from "@mikro-orm/core";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Signature } from "src/entities/signature.entity"; // adjust path as needed
import { CreateSignatureDTO } from "src/modules/signature/dto/create-signature.dto";
import { UpdateSignatureDTO } from "../dto/update-signature.dto";

@Injectable()
export class SignatureService {
    constructor(private readonly em: EntityManager) {}

    async getAll() {
        //1) Return all signatures
        return this.em.find(Signature, {});
    }

    async create(dto: CreateSignatureDTO) {
        //1) Create signature entity
        const signature = this.em.create(Signature, dto);

        //2) Persist and flush signature entity
        await this.em.persist(signature).flush();

        //3) Return signature
        return {
            message: "Signature created successfully",
            signature
        };
    }

    async update(dto: UpdateSignatureDTO, id: number) {
        //1) Find signature
        const signature = await this.em.findOne(Signature, { id });
        
        //2) Throw error for invalid signature
        if (!signature) {
            throw new NotFoundException("Invalid signature id");
        }
        
        //3) Update signature
        this.em.assign(signature, dto, { ignoreUndefined: true });
        
        //4) Flush (persist) changes
        await this.em.flush();

        //5) Return updated signature
        return {
            message: "Signature updated successfully",
            signature
        };
    }

    async delete(id: number) {
        //1) Find signature
        const signature = await this.em.findOne(Signature, { id });
        
        //2) Throw error for invalid signature
        if (!signature) {
            throw new NotFoundException(`Signature with id ${id} not found`);
        }
        
        //3) Remove signature and persist changes
        await this.em.remove(signature).flush();

        //4) Return back success response
        return { message: `Signature deleted successfully` };
    }
}