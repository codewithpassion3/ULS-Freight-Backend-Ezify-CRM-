import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { SignupDTO } from "../dto/signup.dto";
import { EntityManager } from "@mikro-orm/postgresql";
import { User } from "src/entities/user.entity";
import { Address } from "src/entities/address.entity";
import { Company } from "src/entities/company.entity";
import * as bcrypt from 'bcrypt';
import { CompanyShippingPreference } from "src/entities/company-shipping-preference.entity";
import { ShipmentVolume } from "src/common/enum/shipment-volume.enum";
import { ShippingType } from "src/common/enum/shipping-type.enum";
import { SigninDTO } from "../dto/signin.dto";

@Injectable()
export class AuthService{
    constructor(private readonly em: EntityManager){}

    async signup(dto: SignupDTO) {
        return this.em.transactional(async(em) => {
            //1) Extract fields from dto
            const { user, company, address, shippingPreference } = dto;
            console.log({user})

            //2) Check exisiting user againts email
            const existingUser = await em.findOne(User, { email: user.email});

            //3) Throw error for existing user
            if(existingUser) {
                throw new ConflictException("User already exists with this email address");
            }

           //4) Create address
           const addressEntity = em.create(Address, {...address});

           //5) Create company
           const companyEntity = em.create(Company, {...company, address: addressEntity});
           
           //6) Create company preference
           const companyPreference = shippingPreference.map((pref) => 
            em.create(CompanyShippingPreference, {
                shippingType: pref.shippingType as ShippingType,
                shippingVolume: pref.shippingVolume as ShipmentVolume ?? null,
                company: companyEntity
            })
           )

           //7) Hash user password
           const hashedPassword = await bcrypt.hash(user.password, 10);

           //8) Create user
           const userEntity = em.create(User, {
            ...user,
            password: hashedPassword,
            company: companyEntity
           })

           //9) Persist all changes
           await em.persist([
            addressEntity,
            companyEntity,
            ...companyPreference,
            userEntity
           ]).flush();

           //10) Return created user
           return userEntity
        })
    }

    async signin(dto: SigninDTO) {
        //1) Extract email and password
        const { email, password } = dto;

        //2) Check user exists and throw error for invalid credentials
        const user = await this.em.findOne(User, { email });

        if(!user){
            throw new UnauthorizedException("Invalid credentials")
        }

        //4) Compare password and throw error for invalid credentials
        const passwordMatched = await bcrypt.compare(password, user.password);

        if(!passwordMatched){
            throw new UnauthorizedException("Invalid credentials")
        }

        //5) return user
        return user;
    }
}