import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh'){
    constructor(){
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => req?.cookies?.['refresh_token'],
            ]),
            secretOrKey: process.env.JWT_REFRESH_SECRET!,
        });
    }

    async validate(payload: any){
        return {
            id: payload.sub,
            username: payload.username,
            email: payload.email,
            exp: payload.exp,
            role: payload.role,
          };
    }
}