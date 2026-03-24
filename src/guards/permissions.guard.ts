import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class PermissionsGuard implements CanActivate{
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        //1) Get the request object
        const request = context.switchToHttp().getRequest();
        
        //2) Get user permissions
        const userPermissions = request.session?.permissions ?? [];

        //3) Get the path uri
        const path = request.route?.path;

        //4) Extract permission resource from path
        const normalizedPath = path?.split("/").filter(Boolean)[0];

        //5) Define permission route mapping
        const routePermissionMapping: Record<string,string> = {
            "quotes" : "shipping",
            "invoices": "invoicing",
            "claims": "claims"
        }

        //6) Get the required permission for curren route
        const requiredPermission = routePermissionMapping[normalizedPath];

        //7) Throw error for invalid route permission
        if(!requiredPermission){
            throw new ForbiddenException("Permission not configured for this route");
        }

        //8) Check for access against current route permission
        const hasAccess = userPermissions.includes(requiredPermission);

        //9) Throw error for missing permission
        if (!hasAccess) {
            throw new ForbiddenException(
                `Missing permission: ${requiredPermission}`,
            );
        }

        //10) Let it pass
        return true;
    }
}