import { BadRequestException, CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class SessionAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean  {
        const request = context.switchToHttp().getRequest();
        const session = request.session?.userId;

        if(!session){
            throw new BadRequestException({
                message: "User session not found. Please login first.",
                error: "SESSION_REQUIRED",
            })
        }

        return true;
    }
}