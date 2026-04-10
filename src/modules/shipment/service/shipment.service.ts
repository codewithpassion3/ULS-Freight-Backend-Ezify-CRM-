import { EntityManager } from "@mikro-orm/postgresql";
import { BadRequestException, Injectable  } from "@nestjs/common";
import { SessionData } from "express-session";
import { CreateShipmentDTO } from "../dto/create-shipment.dto";
import { Shipment } from "src/entities/shipment.entity";
import { BillingReference } from "src/entities/BillingReference.entity";
import { QuoteType } from "src/common/enum/quote-type.enum";
import { StandardQuoteFactory } from "src/factory/standard-quote.factory";
import { UpdateShipmentDTO } from "../dto/update-shipment.dto";
import { Quote } from "src/entities/quote.entity";

@Injectable()
export class ShipmentService {
  constructor(
    private readonly em: EntityManager, 
  ) {}

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

  private async updateQuote(
    quote: Quote,
    dto: any,
    session: SessionData
  ): Promise<Quote> {
    if (!dto?.quote?.quoteType) {
      throw new BadRequestException("quoteType is required in quote");
    }

    if (dto.quote.quoteType !== QuoteType.STANDARD) {
      throw new BadRequestException("Shipment supports only standard quote shipment types");
    }

   
    const dataWithId = {
        ...dto,
        quote: {
            ...dto.quote,
            id: quote.id  // ← Add the missing ID
        }
    };

    const quoteFactory = new StandardQuoteFactory();
    const handler = quoteFactory.update({
        shipmentType: dto.shipmentType,
        data: dataWithId,  // ← Use the modified data
        em: this.em,
        session
    });

    await handler.init();      // Now this.existingQuote will be populated
    await handler.validate();
    await handler.update();

    return quote;
  }

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

  async update(
    updateShipmentDto: UpdateShipmentDTO,
    shipmentId: number,
    session: SessionData
  ): Promise<any> {

      const shipment = await this.em.findOne(Shipment, shipmentId, {
        populate: [
          'quote',
          'quote.addresses',
          'quote.addresses.addressBookEntry',
          'quote.addresses.addressBookEntry.address'
        ]
      });

      if (!shipment) {
        throw new BadRequestException(
          "Invalid shipmentId or you don't have the required permissions"
        );
      }

      // IMPORTANT: operate on SAME managed entity
      await this.updateQuote(shipment.quote, updateShipmentDto, session);

      // Persist all MikroORM changes
      await this.em.flush();

      // Ensure fresh state for response
      await this.em.refresh(shipment, {
        populate: [
          'quote',
          'quote.addresses',
          'quote.addresses.addressBookEntry',
          'quote.addresses.addressBookEntry.address'
        ]
      });

      return {
        message: "Shipment updated successfully",
        quote: shipment.quote
      };
    }
}