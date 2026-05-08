import { Collection, Entity, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { Company } from "./company.entity";
import { Role } from "./role.entity";
import { Permission } from "./permission.entity";
import { Quote } from "./quote.entity";
import { QuoteUserMeta } from "./quote-user-meta.entity";
import { LineItemUnit } from "./line-item-unit.entity";
import { Reminder } from "./reminder.entity";
import { Wallet } from "./wallet.entity";
import { SavedCard } from "./saved-card.entity";

@Entity()
export class User{
    @PrimaryKey()
    id!: number;

    @Property({ nullable: true })
    firstName?: string;

    @Property({ nullable: true })
    lastName?: string;

    @Property({ unique: true})
    email!: string;

    @Property({ nullable: true })
    phoneNumber!: string;

    @Property({ nullable: true, unique: true })
    username?: string;

    @Property({ hidden: true })
    password!: string;

    @Property({ nullable: true})
    signupCode?: string;

    @Property({ nullable: true })
    profilePic?: string | null;

    @Property()
    freightBroker!: boolean;

    @Property()
    termsAndConditionAccepted!: boolean;

    @Property()
    companyPolicyAccepted!: boolean;

    @Property()
    emailIsVerified!: boolean;

    @Property({ nullable: true })
    resetPasswordToken?: string;

    @Property({ nullable: true })
    resetPasswordExpires?: Date;
    
    @Property({ default: null, nullable: true })
    lastLogin?: Date;

    @Property({ onCreate: () => new Date() })
    createdAt?: Date = new Date();
    
    @Property({ onUpdate: () => new Date() })
    updatedAt?: Date = new Date();

    @Property({ type: "json", nullable: true })
    settings?: Record<string, any>;

    @Property({ nullable: false, default: false })
    isMasterAccount?: Boolean;

    @Property({ nullable: true })
    stripeCustomerId?: string;

    @ManyToOne(() => Company)
    company!: Company;

    @ManyToOne(() => Role)
    role!: Role

    @ManyToMany(() => Permission, permission => permission.user,{ owner: true})
    permissions = new Collection<Permission>(this)

    @OneToMany(() => Quote, quote => quote.createdBy)
    quotes = new Collection<Quote>(this)

    @OneToMany(() => QuoteUserMeta, meta => meta.user)
    quoteMeta = new Collection<QuoteUserMeta>(this);

    @OneToMany(() => LineItemUnit, itemUnit => itemUnit.createdBy)
    lineItemUnits = new Collection<LineItemUnit>(this);

    @OneToMany(() => Reminder, reminder => reminder.sendTo)
    reminder = new Collection<Reminder>(this);
}