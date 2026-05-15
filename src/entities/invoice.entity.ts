import { Entity, PrimaryKey, OneToOne, Property, OneToMany, Collection, BeforeCreate, ManyToOne } from "@mikro-orm/core";
import { Quote } from "./quote.entity";
import { Shipment } from "./shipment.entity";
import { randomBytes } from "crypto";
import { Company } from "./company.entity";
import { User } from "./user.entity";
import { Surcharge } from "./surcharge";

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

  @Property({ onCreate: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
  dueDate?: Date;

  @Property({ default: false })
  paid?: Boolean;

  @Property({ default: false })
  urgent?: Boolean;

  @ManyToOne(() => User, { nullable: true, default: null })
  paidBy?: User | null;

  @ManyToOne(() => Company, { nullable: false })
  company!: Company;
  
  @Property({ onCreate: () => new Date()})
  createdAt?: Date;

  @Property({ onCreate:() => new Date(), onUpdate: () => new Date()})
  updatedAt?: Date;

  @ManyToOne(() => Shipment, { nullable: true })
  shipment?: Shipment;

  @OneToMany(() => Surcharge, surcharge => surcharge.invoice)
  surcharges = new Collection<Surcharge>(this);
}