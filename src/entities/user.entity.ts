import { Collection, Entity, ManyToMany, ManyToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { Company } from "./company.entity";
import { Role } from "./role.entity";
import { Permission } from "./permission.entity";

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

    @Property({ nullable: true })
    username?: string;

    @Property({ hidden: true })
    password!: string;

    @Property({ nullable: true})
    signupCode?: string;

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
    
    @ManyToOne(() => Company)
    company!: Company;

    @ManyToOne(() => Role)
    role!: Role

    @ManyToMany(() => Permission, permission => permission.user,{ owner: true})
    permissions = new Collection<Permission>(this)
}