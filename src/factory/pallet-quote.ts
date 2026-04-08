import { Quote } from "src/entities/quote.entity";
import { StandardQuote } from "./standard-quote";
import { validateAddress } from "src/utils/validateAddress";
import { BadRequestException } from "@nestjs/common";
import { validateServicesAgainstQuote, validateUnit } from "src/utils/validateQuote";
import { packageRules, palletRules } from "src/common/constants/quote";

export class PalletQuote extends StandardQuote {
    private readonly quote: Quote;
    private readonly errors: string[];

    constructor(private readonly data: any){
        super();
        this.quote = new Quote();
        this.errors = [];
    }

    validateAndReturn(): Quote {
        this.validateAddress();
        this.validateLineItem();
        this.validateLineItemUnit();
        this.validateServices();
        this.validateInsurance();
        this.validateSignature();

        return this.quote;
    }

    private validateAddress(){
        if (this.data.addresses.length === 0) {
            throw new BadRequestException("Addresses (TO & FROM) are required for pallet quote");
        }
        
        const addresses = this.data.addresses;
        const quoteType = this.data.quoteType;

        const normalizedAddresses = addresses.map((addr: any) => ({
          ...addr,
          locationType: addr.locationType ?? undefined,
        }));
        
       for (const address of normalizedAddresses) {
            this.errors.push(...validateAddress(address, quoteType));
        }
       
        if (this.errors.length > 0) {
            throw new BadRequestException({
                message: this.errors,
            });
        }
    }

    private validateLineItem(){
        if(!this.data.lineItem){
            throw new BadRequestException("Line item is required for pallet quote");
        }

        if(this.data.lineItem?.units.length === 0){
            throw new BadRequestException("At least one unit is required for pallet quote")
        }

        if(this.data.lineItem?.type !== this.data.shipmentType) {
            throw new BadRequestException("Line item type must match shipment type")
        }
        
        if(this.data.lineItem.stackable === undefined){
            throw new BadRequestException("stackable is required in pallet quote")
        }

        if(this.data.lineItem.dangerousGoods === undefined){
            throw new BadRequestException("dangerousGoods is required in pallet quote")
        }
    }

    private validateLineItemUnit(){
        if (this.data.lineItem?.units?.length) {
            this.data.lineItem.units.forEach((unit: any, idx: number) => {
              const result = validateUnit(unit, palletRules, { unitIndex: idx });
              this.errors.push(...result.errors);
            });
        }

        if (this.errors.length > 0) {
            throw new BadRequestException({
                message: this.errors,
            });
        }
    }

    private validateServices(){
      if(!this.data.services){
        throw new BadRequestException("Services are required in pallet quote")
      }
      
      const errors = validateServicesAgainstQuote(this.data.services, this.data.shipmentType);

      if (errors.length > 0) {
            throw new BadRequestException({
                message: errors,
            });
       }
    }

    private validateInsurance(){
        if(!this.data.insurance){
            throw new BadRequestException( "Insurance is required in pallet quote")
        }
    }

    private validateSignature(){
        if(this.data.signature){
            throw new BadRequestException("Signature is is not supported in pallet quote")
        }
    }
}