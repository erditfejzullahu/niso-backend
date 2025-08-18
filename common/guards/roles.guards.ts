import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate{
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler())
        if(!requiredRoles) return true;

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if(!user || !user.role){
            throw new UnauthorizedException("Invalid user permissions")
        }

        return requiredRoles.some((role) => user.role === role);
    }
}