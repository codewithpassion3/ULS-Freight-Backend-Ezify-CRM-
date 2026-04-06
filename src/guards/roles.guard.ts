import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const roles = this.reflector.getAllAndOverride<string[]>(
            "roles",
            [
                context.getHandler(),
                context.getClass()
            ]
        )

        const request = context.switchToHttp().getRequest();
        
        const sessionRole = request.session?.role;

        const isAllowedToPerformAction = roles.includes(sessionRole);
        
        if(!isAllowedToPerformAction) {
            throw new UnauthorizedException("You don't have the required permissions")
        }

        return true;
    }
}