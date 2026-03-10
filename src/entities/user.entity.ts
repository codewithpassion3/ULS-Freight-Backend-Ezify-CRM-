import { Entity, ManyToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { Company } from "./company.entity";
import { Exclude } from "class-transformer";

@Entity()
export class User{
    @PrimaryKey()
    id!: number;

    @Property()
    firstName!: string;

    @Property()
    lastName!: string;

    @Property({ unique: true})
    email!: string;

    @Property()
    phoneNumber!: string;

    @Property()
    username!: string;

    @Exclude()
    @Property()
    password!: string;

    @Property({ nullable: true})
    signupCode?: string;

    @Property()
    freightBroker!: boolean;

    @Property()
    termsAndConditionAccepted!: boolean;

    @Property()
    companyPolicyAccepted!: boolean;
    
    @ManyToOne(() => Company)
    company!: Company;
}