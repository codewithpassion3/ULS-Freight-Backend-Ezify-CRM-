import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { SignupDTO } from "../dto/signup.dto";
import { EntityManager } from "@mikro-orm/postgresql";
import { User } from "src/entities/user.entity";
import { Address } from "src/entities/address.entity";
import { Company } from "src/entities/company.entity";
import * as bcrypt from 'bcrypt';
import { CompanyShippingPreference } from "src/entities/company-shipping-preference.entity";
import { PackageShipmentVolume, PalletShipmentVolume } from "src/common/enum/shipment-volume.enum";
import { ShippingType } from "src/common/enum/shipping-type.enum";
import { SigninDTO } from "../dto/signin.dto";
import { Role } from "src/entities/role.entity";
import { ROLES } from "src/common/constants/roles";
import { OtpPurpose } from "src/common/enum/otp-purpose.enum";
import { OtpService } from "src/modules/otp/service/otp.service";
import { ForgotPasswordDTO } from "../dto/forgot-password.dto";
import { ResetPasswordDTO } from "../dto/reset-password.dto";

@Injectable()
export class AuthService{
    constructor(
        private readonly em: EntityManager,
        private readonly otpService: OtpService
    ){}

    async signup(dto: SignupDTO) {
       const userEntity =  await this.em.transactional(async(em) => {
            //1) Extract fields from dto
            const { user, company, address, shippingPreference } = dto;

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
           
            //6) Create company preferences
            const companyPreference = shippingPreference.map((pref) => {
                const { shippingType, shippingVolume } = pref;

                if (shippingVolume) {

                    const palletVolumes = Object.values(PalletShipmentVolume);
                    const packageVolumes = Object.values(PackageShipmentVolume);

                    if (shippingType === ShippingType.PALLET && !palletVolumes.includes(shippingVolume as PalletShipmentVolume))
                    throw new BadRequestException( "Invalid pallet shipment volume, volume should be one of: 1-5, 6-10, 11-20, 21-50, >50");

                    if (shippingType === ShippingType.PACKAGE && !packageVolumes.includes(shippingVolume as PackageShipmentVolume))
                    throw new BadRequestException("Invalid package shipment volume, volume should be one of: <25, 26-50, 50-100, 101-300, >300");

                }

                return em.create(CompanyShippingPreference, {
                    shippingType: shippingType as ShippingType,
                    shippingVolume: shippingType === ShippingType.PTLORFTL ? null : (shippingVolume as PalletShipmentVolume | PackageShipmentVolume) ?? null,
                    company: companyEntity
                });

            });

           //7) Hash user password
           const hashedPassword = await bcrypt.hash(user.password, 10);
        
           //8) Fetch admin role and attach it to user
           const role = await em.findOneOrFail(Role, { name: ROLES.ADMIN});

           //9) Create user
           const userEntity = em.create(User, {
            ...user,
            role: role,
            password: hashedPassword,
            company: companyEntity,
            emailIsVerified: false
           })

           //10) Persist all changes
           await em.persist([
            addressEntity,
            companyEntity,
            ...companyPreference,
            userEntity
           ]).flush();

           await this.em.populate(userEntity, [
            'company',
            'role',
            'permissions'
            ]);

           //11) Return created user
           return userEntity
        })

        //12) Send out otp email to user
        this.otpService.generate({
            email: userEntity.email,
            purpose: OtpPurpose.EMAIL_VERIFICATION
        });
        
        //13) Return user
        return userEntity;
    }

    async signin(dto: SigninDTO) {
        //1) Extract email and password
        const { email, password } = dto;

        //2) Check user exists and throw error for invalid credentials
        const user = await this.em.findOne(User, { email }, { populate: ["role"] });
        if(!user){
            throw new UnauthorizedException("Invalid credentials")
        }

        //4) Compare password and throw error for invalid credentials
        const passwordMatched = await bcrypt.compare(password, user.password);
        if(!passwordMatched){
            throw new UnauthorizedException("Invalid credentials")
        }

        //5) Update last login field
        user.lastLogin = new Date();

        await this.em.persist(user).flush();

        //6) return user
        return user;
    }

    async forgotPassword(dto: ForgotPasswordDTO){
        //1) Extract fields
        const { email } = dto;

        //2) Validate email account
        const user = await this.em.findOne(User, {email}, { fields: ["id"]});

        //3) Throw error for invalid user email
        if(!user){
            throw new BadRequestException("Invalid email address")
        }

        //4) Send otp to email address
        this.otpService.generate({
            email,
            purpose: OtpPurpose.PASSWORD_RESET
        })

        return {
            message: "Otp sent to email successfully"
        };
    }

    async resetPassword(dto: ResetPasswordDTO){
        //1) Extract fields
        const { email, resetToken, password } = dto;

        //2) Check for reset token validity
        const user = await this.em.findOne(User, { email }, { fields: ["id", "password", "resetPasswordToken", "resetPasswordExpires"]});

        //3) Throw error for invalid email
        if(!user){
            throw new BadRequestException("Invalid email address")
        }

        //4) Throw error for invalid reset request
        if(!user.resetPasswordToken || !user.resetPasswordExpires){
            throw new BadRequestException("Invalid reset request");
        }

        //5) Compare token and check it's validity
        const isExpired = (user.resetPasswordExpires as Date) < new Date();

        if(isExpired){
            throw new BadRequestException("Expired reset token, try resetting again")
        }

        //6) Check token validity
        const isValidToken = await bcrypt.compare(resetToken, user.resetPasswordToken as string);

        if(!isValidToken){
            throw new BadRequestException("Invalid reset token");
        }

        //7) Prevent reusing the same password
        const isSamePassword = await bcrypt.compare(password, user.password);

        if (isSamePassword) {
            throw new BadRequestException(
                "New password must be different from the previous password"
            );
        }

        //8) hash user password and update user
        const hashedPassword = await bcrypt.hash(password, 10);

        await this.em.nativeUpdate(User, { id: user.id },{
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null
        })

        //9) Return success response
        return {
            message: "Password reset successful"
        }
    }
}