import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import bcryptjs from "bcryptjs"
import { User } from '@prisma/client';
import { Response } from 'express';
import { RegisterUserDto } from './dto/registerUser.dto';
@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService
    ) {}

    async login(email: string, password: string, res: Response) {
        const user = await this.prisma.user.findUnique({where: {email}});
        if(!user) throw new UnauthorizedException('Kredencialet e pavlefshme');

        const valid = await bcryptjs.compare(password, user.password);
        if(!valid) throw new UnauthorizedException('Kredencialet e pavlefshme');

        const {accessToken, refreshToken} = await this.getTokens(user);

        await this.prisma.refreshToken.create({
            data: {token: refreshToken, userId: user.id}
        })

        const isProduction = process.env.NODE_ENV === "production";

        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: isProduction, //true in production
            sameSite: 'lax',
            // domain: isProduction ? ''
            maxAge: 1000 * 60 * 60
        })

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            // domain: isProduction ? '.nejatnkosov.com' : undefined,
            maxAge: 1000 * 60 * 60 * 24 * 7
        })
        return {success: true}
    }

    async updateUserSession(userId: string, res: Response){
        const user = await this.prisma.user.findUnique({where: {id: userId}})
        if(!user) throw new UnauthorizedException("no user id found");
    }

    async registerUser(registerDto: RegisterUserDto, imageUrl: string){
        const user = await this.prisma.user.findUnique({where: {email: registerDto.email}})
        if(user) throw new UnauthorizedException('Ky email vecse egziston.');
        const hashedPassword = await bcryptjs.hash(registerDto.password, 10)
        await this.prisma.user.create({
            data: {
                email: registerDto.email,
                fullName: registerDto.fullName,
                user_verified: false,
                role: registerDto.role === 0 ? "DRIVER" : "PASSENGER",
                password: hashedPassword,
                image: imageUrl
            }
        })
        return {success: true}
    }

    async getTokens(user: User) {
        const payload = {sub: user.id, username: user.fullName, email: user.email, role: user.role, user_verified: user.user_verified, user_created: user.createdAt, profileImage: user.image};

        const accessToken = await this.jwtService.signAsync(payload, {
            secret: process.env.JWT_ACCESS_SECRET,
            expiresIn: process.env.JWT_ACCESS_EXPIRATION
        });

        const refreshToken = await this.jwtService.signAsync(payload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: process.env.JWT_REFRESH_EXPIRATION
        })

        return {accessToken, refreshToken};
    }
}
