import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => {
                  return req.cookies?.['access_token'];
                },
              ]),
            secretOrKey: process.env.JWT_ACCESS_SECRET!,
        });
    }
    async validate(payload: any) {        
        return {
            id: payload.sub,
            username: payload.username,
            email: payload.email,
            exp: payload.exp,
            role: payload.role,
          };
    }
}