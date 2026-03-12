import { BadRequestException, Injectable } from "@nestjs/common";
import { GenerateOtpDTO } from "../dto/generate-otp.dto";
import { VerifyOtpDTO } from "../dto/verify-otp.dto";
import { EntityManager } from "@mikro-orm/core";
import { generateRandomNumbers } from "src/utils/generateRandomNumbers";
import { OTP } from "src/entities/otp.entity";
import { User } from "src/entities/user.entity";
import { EmailService } from "src/email/service/email.service";
import bcrypt from "bcrypt";

@Injectable()
export class OtpService {
  constructor(
    private readonly em: EntityManager,
    private readonly emailService: EmailService,
  ) {}

  async generate(dto: GenerateOtpDTO){
    const { email, purpose } = dto;
    const now = new Date();

    //1) Validate email
    const user = await this.em.findOne(
      User,
      { email },
      { fields: ["firstName", "lastName"] }
    );

    if (!user) {
      throw new BadRequestException("Invalid email address");
    }

    //2) Cooldown check (30 seconds)
    const lastOtp = await this.em.findOne(
      OTP,
      { email, purpose },
      { orderBy: { createdAt: "DESC" } }
    );

    if (lastOtp && now.getTime() - (lastOtp.createdAt as Date).getTime() < 30 * 1000) {
      throw new BadRequestException(
        "Please wait 30 seconds before requesting another OTP"
      );
    }

    //3) Delete previous Otps
    await this.em.nativeDelete(OTP, { email, purpose });

    //4) Generate Otp
    const code = generateRandomNumbers(6);

    //5) Hash Otp
    const hashedOtp = await bcrypt.hash(code, 10);

    //6) Create Otp entity
    const otp = this.em.create(OTP, {
      email,
      purpose,
      code: hashedOtp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    //7) Save Otp
    await this.em.persist(otp).flush();

    //8) Emit email event
    this.emailService.sendOtpEmail({
      to: email,
      subject: "Verify email address",
      template: "verify-email",
      context: {
        name: `${user.firstName} ${user.lastName}`,
        otp: code
      }
    });

    return {
      message: "OTP sent successfully",
    };
  }

  async verify(dto: VerifyOtpDTO) {
    const { email, purpose, code } = dto;
    const now = new Date();

    //1)  Find Otp
    const otp = await this.em.findOne(OTP, { email, purpose });

    //2) Throw error for invalid Otp
    if (!otp) {
        throw new BadRequestException("OTP not found");
    }

    //3) Check if blocked
    if (otp.blockedUntil && otp.blockedUntil > now) {
        throw new BadRequestException(
            "Too many attempts, try again after an hour"
        );
    }

    //4) Check expiry
    if (otp.expiresAt < now) {
        throw new BadRequestException("OTP expired");
    }

    //5) Verify OTP using bcrypt
    const isValid = await bcrypt.compare(code, otp.code);

    if (!isValid) {    
        otp.retries = (otp.retries as number) + 1;

        if((otp.retries as number) >= 4){
            otp.blockedUntil = new Date(Date.now() + 60 * 60 * 1000)
            otp.retries = 0;
        }

        await this.em.flush();

        throw new BadRequestException("Invalid Otp");
    }

    //5) Mark OTP used
    otp.used = true;
    await this.em.flush();

    //6) Verify user email
    await this.em.nativeUpdate(User, { email }, { emailIsVerified: true });

    return { message: "Otp verified successfully" };
  }
}