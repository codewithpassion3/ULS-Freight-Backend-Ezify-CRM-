import { EntityManager } from "@mikro-orm/postgresql";
import { BadRequestException, Injectable  } from "@nestjs/common";
import { SessionData } from "express-session";
import { CreateShipmentDTO } from "../dto/create-shipment.dto";
import { Shipment } from "src/entities/shipment.entity";
import { BillingReference } from "src/entities/BillingReference.entity";
import { QuoteType } from "src/common/enum/quote-type.enum";
import { StandardQuoteFactory } from "src/factory/standard-quote.factory";
import { SpotQuoteFactory } from "src/factory/spot-quote.factory";

@Injectable()
export class ShipmentService {
  constructor(
    private readonly em: EntityManager, 
  ) {}


  async create(createShipmentDto: CreateShipmentDTO, session: SessionData) {
        // Step 1: Validate and build the quote based on shipment type
        const quote = await this.buildQuote(createShipmentDto, session);
        
        // Step 2: Create shipment with the built quote
        const shipment = new Shipment();
        shipment.shipDate = new Date(createShipmentDto.shipDate);
        shipment.quote = quote;
        shipment.tailgateRequiredInToAddress = createShipmentDto.tailgateRequiredInToAddress ?? false;
        shipment.tailgateRequiredInFromAddress = createShipmentDto.tailgateRequiredInFromAddress ?? false;

        // Step 3: Build and attach billing references
        if (createShipmentDto.billingReferences && createShipmentDto.billingReferences?.length > 0) {
            const billingReferences = createShipmentDto.billingReferences.map(code => {
                const ref = new BillingReference();
                ref.code = code;
                ref.shipment = shipment; // Set inverse side
                return ref;
            });

            shipment.billingReferences.add([...billingReferences]);
        }

        // Step 4: Persist everything in one transaction
        this.em.persist(quote);
        this.em.persist(shipment);

        await this.em.flush()

        // Step 5: Return populated response
        return {
          message: "Shipment created successfully"
        }
    }

    private async buildQuote(dto: CreateShipmentDTO, session: SessionData) {
      if(dto.quote.quoteType !== QuoteType.STANDARD){
        throw new BadRequestException("Shipment supports only standard quote shipment types");
      }

      const quoteFactory = new StandardQuoteFactory();
    
      const quote = quoteFactory.create({ shipmentType: dto.shipmentType, data: dto, em: this.em, session });
      
      // Sync validation - throws BadRequestException if invalid
      await quote.validate();
      
      // Async build - returns populated Quote entity
      return await quote.build();
    }

}