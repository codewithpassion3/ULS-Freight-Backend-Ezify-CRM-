import { Body, Controller, HttpCode, Patch, Post, Req, Res, UseGuards } from "@nestjs/common";
import { AuthService } from "../service/auth.service";
import { SignupDTO } from "../dto/signup.dto";
import type { Request, Response } from "express";
import { SigninDTO } from "../dto/signin.dto";
import { SessionAuthGuard } from "src/guards/sessionAuth.guard";
import { ForgotPasswordDTO } from "../dto/forgot-password.dto";
import { ResetPasswordDTO } from "../dto/reset-password.dto";

@Controller('auth')
export class AuthController {
   constructor(private readonly AuthService: AuthService) {}

   @Post('/signup')
   async Signup(@Body() dto: SignupDTO, @Req() req: Request){
      const user = await this.AuthService.signup(dto);

      req.session.userId = user.id;
      req.session.role = user.role.name;
      req.session.companyId = user.company.id;
      req.session.permissions = user.permissions.getItems().map(p => p.name);

      return {
         message: "Signup successfull",
         user
      }
   }

   @Post('/signin')
   async Signin(@Body() dto: SigninDTO, @Req() req: Request){
      const user = await this.AuthService.signin(dto);
      req.session.userId = user.id;
      req.session.role = user.role.name;
      req.session.companyId = user.company.id;
      req.session.permissions = user.permissions.getItems().map(p => p.name);

      return {
         message: "Signin successfull",
         user
      }
   }

   @UseGuards(SessionAuthGuard)
   @Post('/logout')
   @HttpCode(200)
   async Logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
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

   @Post('/forgot-password')
   async ForgotPassword(@Body() dto: ForgotPasswordDTO){
      return await this.AuthService.forgotPassword(dto);
   }

   @Patch('/reset-password')
   async ResetPassword(@Body() dto: ResetPasswordDTO) {
      return await this.AuthService.resetPassword(dto);
   }
}