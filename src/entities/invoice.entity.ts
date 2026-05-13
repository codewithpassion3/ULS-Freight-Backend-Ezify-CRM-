import { Entity, PrimaryKey, OneToOne, Property, OneToMany, Collection, BeforeCreate } from "@mikro-orm/core";
import { Quote } from "./quote.entity";
import { Shipment } from "./shipment.entity";
import { randomBytes } from "crypto";

@Entity()
export class Invoice {

  @PrimaryKey()
  id!: number;

  @Property({ unique: true })
  invoiceNumber!: string;
  
  @BeforeCreate()
  generateInvoiceNumber() {
    this.invoiceNumber = `ULS${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  invoiceDate?: Date;

  @OneToMany(() => Shipment, shipment => shipment.invoices)
  shipment = new Collection<Shipment>(this);
}