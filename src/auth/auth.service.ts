import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import bcryptjs from "bcryptjs"
import { Gender, KosovoCity, User, UserInformation } from '@prisma/client';
import { Response } from 'express';
import { RegisterUserDto } from './dto/registerUser.dto';
import { UploadService } from 'src/upload/upload.service';
import { VerifyIdentityDto } from './dto/verifyIdentity.dto';
import { UpdateUserInformationDto } from './dto/updateUser.dto';
import { UpdatePasswordDto } from './dto/updatePassword.dto';
import { ConversationsGateway } from 'src/conversations/conversations.gateway';
@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly uploadService: UploadService,
        private readonly conversationGateway: ConversationsGateway
    ) {}

    async updateSession(userId: string, res: Response){
        const user = await this.prisma.user.findUnique({where: {id: userId}});
        if(!user) throw new NotFoundException("Nuk u gjet perdoruesi.");
        const {accessToken, refreshToken} = await this.getTokens(user);

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
        return {success: true};
    }

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

    async registerUser(registerDto: RegisterUserDto, file: Express.Multer.File){
        try {
            const user = await this.prisma.user.findUnique({where: {email: registerDto.email}})
            if(user) throw new UnauthorizedException('Ky email vecse egziston.');
            const hashedPassword = await bcryptjs.hash(registerDto.password, 10);
            const resultImage = await this.uploadService.uploadFile(file, `users/${registerDto.email}`);
            const newUser = await this.prisma.user.create({
                data: {
                    email: registerDto.email,
                    fullName: registerDto.fullName,
                    user_verified: false,
                    role: registerDto.role === 0 ? "DRIVER" : "PASSENGER",
                    password: hashedPassword,
                    image: resultImage.success ? resultImage.data?.url : ""
                },
                include: {
                    userInformation: {
                        select: {
                            city: true
                        }
                    }
                }
            })

            this.conversationGateway.newRegisteredDriverNotifyToPassengers(newUser as User & {userInformation: UserInformation});
            return {success: true}
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException('Dicka shkoi gabim ne server!')
        }
    }

    async getTokens(user: User) {
        const payload = {sub: user.id, fullName: user.fullName, email: user.email, role: user.role, user_verified: user.user_verified, user_created: user.createdAt, profileImage: user.image};

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

    async verifyIdentity(userId: string, identityDto: VerifyIdentityDto, files: {selfie: Express.Multer.File, id_card: Express.Multer.File[]}){
        try {
            
            const user = await this.prisma.user.findUnique({where: {id: userId}, include: {userInformation: true}});
            if(!user){
                throw new BadRequestException('Nuk u gjet ndonje perdorues.');
            }else if(user.userInformation){
                throw new BadRequestException('Ju vecse keni kompletuar procesin e verifikimit. Prisni per ndryshim te statusit')
            }else{
                const selfiePhotoResult = await this.uploadService.uploadFile(files.selfie, `users/${user.email}/selfie`);
                if(!selfiePhotoResult.success) throw new BadRequestException('Gabim ne ngarkimin e fotos suaj selfie.');
                const idCardsResult = await this.uploadService.uploadMultipleFiles(files.id_card, `users/${user.email}/idCards`);
                if(idCardsResult.every(item => item.success) === false) throw new BadRequestException('Gabim ne ngarkimin e dokumentit tuaj.');
    
                await this.prisma.userInformation.create({
                    data: {
                        userId: user.id,
                        ID_Card: idCardsResult.map((item) => item.data?.url),
                        SelfiePhoto: selfiePhotoResult.data?.url,
                        address: identityDto.address,
                        city: identityDto.city as KosovoCity,
                        gender: identityDto.gender as Gender
                    },
                })
                return {success: true}
            }
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException('Dicka shkoi gabim ne server!')
        }
    }

    async updateUserInformation(userId: string, updateDto: UpdateUserInformationDto, newImage?: Express.Multer.File) {
        try {
            const user = await this.prisma.user.findUnique({where: {id: userId}});
            if(!user){
                throw new BadRequestException('Nuk u gjet ndonje perdorues.')
            }else{
                let userImage: string = user.image;
                if(newImage){
                    const publicId = this.uploadService.extractPublicIdFromUrl(userImage);

                    const newUserImage = await this.uploadService.uploadFile(newImage, `users/${user.email}`);
                    if(!newUserImage.success) throw new BadRequestException('Dicka shkoi gabim ne ngarkimin e fotos stuaj te profilit.');
                    userImage = newUserImage.data?.url
                }
                await this.prisma.user.update(
                    {where: {id: userId},
                    include: {
                        userInformation: true
                    },
                    data: {
                        fullName: updateDto.fullName,
                        image: userImage,
                        userInformation: {
                            update: {
                                address: updateDto.address,
                                city: updateDto.city as KosovoCity,
                                gender: updateDto.gender as Gender
                            }
                        }
                    }
                })
            }
            return {success: true}
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException('Dicka shkoi gabim ne server!')
        }
    }

    async updatePassword(userId: string, passwordDto: UpdatePasswordDto){
        try {
            const user = await this.prisma.user.findUnique({where: {id: userId}})
            if(!user){
                throw new BadRequestException("Nuk u gjet ndonje perdorues.")
            }else{
                if(passwordDto.password !== passwordDto.confirmPassword){
                    throw new BadRequestException("Fjalekalimet tek fushat e kerkuara duhet te jene te njejta!")
                }
                const hashedPassword = await bcryptjs.hash(passwordDto.password, 10);
                await this.prisma.user.update({
                    where: {id: userId},
                    data: {password: hashedPassword}
                })
                return {success: true};
            }
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server!")
        }
    }
}
