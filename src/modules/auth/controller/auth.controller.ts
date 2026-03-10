import { Body, Controller, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import { AuthService } from "../service/auth.service";
import { SignupDTO } from "../dto/signup.dto";
import type { Request, Response } from "express";
import { SigninDTO } from "../dto/signin.dto";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";

@Controller('auth')
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

   @UseGuards(SessionAuthGuard)
   @Post('/logout')
   @HttpCode(200)
   async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
   return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
         if (err) {
         return reject(err);
         }

         res.clearCookie("connect.sid");

         resolve({
         message: "Logged out successfully",
         });
      });
   });
   }
}