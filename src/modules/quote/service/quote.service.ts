import { EntityManager } from "@mikro-orm/postgresql";
import { Injectable } from "@nestjs/common";
import { CreateQuoteDTO } from "../dto/create-quote.dto";

@Injectable()
export class QuoteService {
    constructor(private readonly em: EntityManager) {}

    async create(dto: CreateQuoteDTO, currentUserId: number){
        return {
            message: "Quote created successfully"
        }
    }
}