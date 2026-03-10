import { Body, Controller, Post, Req } from "@nestjs/common";
import { AuthService } from "../service/auth.service";
import { SignupDTO } from "../dto/signup.dto";
import type { Request } from "express";
import { SigninDTO } from "../dto/signin.dto";

@Controller()
export class AuthController {
   constructor(private readonly AuthService: AuthService) {}

   @Post('/signup')
   async Signup(@Body() dto: SignupDTO, @Req() req: Request){
      const user = await this.AuthService.signup(dto);
      req.session.userId = user.id;

      return {
         message: "Signup successfull",
         user
      }
   }

   @Post('/signin')
   async Signin(@Body() dto: SigninDTO, @Req() req: Request){
      const user = await this.AuthService.signin(dto);
      req.session.userId = user.id;

      return {
         message: "Signin successfull",
         user
      }
   }
}