import { BadRequestException, Body, Controller, FileTypeValidator, Get, MaxFileSizeValidator, ParseFilePipe, Patch, Post, Req, Res, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoginUserDto } from './dto/loginUser.dto';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/registerUser.dto';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from 'src/upload/upload.service';
import { Public } from 'common/decorators/public.decorator';
import { Roles } from 'common/decorators/roles.decorator';
import { Role, User } from '@prisma/client';
import { VerifyIdentityDto } from './dto/verifyIdentity.dto';
import { UpdateUserInformationDto } from './dto/updateUser.dto';
import { UpdatePasswordDto } from './dto/updatePassword.dto';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
    ){}


    @Roles(Role.DRIVER, Role.PASSENGER)
    @Post('update-profile-image')
    @UseInterceptors(FileInterceptor('newProfileImage'))
    async updateProfileImage(
        @Req() req: Request,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({maxSize: 10 * 1024 * 1024}), //10mb
                    new FileTypeValidator({
                        fileType: /(jpg|jpeg|png|gif|webp|bmp|tiff|svg)$/
                    })
                ]
            })
        )
        file: Express.Multer.File
    ){
        const user = req.user as User;
        await this.authService.updateProfilePicture(user.id, file);
    }

    @Public()
    @Post('login')
    async loginUser(@Body() body: LoginUserDto, @Res({passthrough: true}) res: Response){
        return await this.authService.login(body.email, body.password, res)
    }

    @Public()
    @Post('register')
    @UseInterceptors(FileInterceptor('profileImage'))
    async registerUser(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({maxSize: 10 * 1024 * 1024}), //10mb
                    new FileTypeValidator({
                        fileType: /(jpg|jpeg|png|gif|webp|bmp|tiff|svg)$/
                    })
                ]
            })
        )
        file: Express.Multer.File,
        @Body() body: RegisterUserDto
    ){
        return await this.authService.registerUser(body, file);
    }

    @Roles(Role.DRIVER, Role.PASSENGER)
    @Get('profile')
    async getProfile(@Req() req: Request){
        const user = req.user as User;
        await this.authService.getProfile(user.id);
    }

    @Roles(Role.DRIVER, Role.PASSENGER)
    @Post('verify-identity')
    @UseInterceptors(FileFieldsInterceptor([
        {name: "id_card", maxCount: 2},
        {name: "selfie", maxCount: 1}
    ]))
    async verifyIdentity(
        @Req() request: Request,
        @Body() body: VerifyIdentityDto,
        @UploadedFiles() files: {
            id_card: Express.Multer.File[],
            selfie: Express.Multer.File
        }
    ){
        const user = request.user as User;
        if(!files.selfie.mimetype.startsWith('image/')){
            throw new BadRequestException('Fotoja selfie duhet te jete skedar imazhi.')
        }
        if(files.selfie.size > 10 * 1024 * 1024){
            throw new BadRequestException('Fajlli duhet te jete maksimum 10MB.')
        }
        
        if(files.id_card && files.id_card.length < 2) throw new BadRequestException('Duhet te jene dy foto te dokumentit.');
        files.id_card.map((file) => {
            if(!file.mimetype.startsWith('image/')) throw new BadRequestException('Dokumenti duhet te jete skedar imazhi.');
            if(file.size > 10 * 1024 * 1024) throw new BadRequestException('Fajlli duhet te jete maksimum 10MB.');
        })

        return await this.authService.verifyIdentity(user.id, body, files);
    }

    @Roles(Role.DRIVER, Role.PASSENGER)
    @Post('logout')
    async logout(@Res({passthrough: true}) res: Response) {
        const isProduction = process.env.NODE_ENV === "production";

        res.clearCookie('access_token', {
            httpOnly: true,
            secure: isProduction, //true in production
            sameSite: 'lax',
            // domain: isProduction ? ''
            maxAge: 1000 * 60 * 60
        })

        res.clearCookie('refresh_token', {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            // domain: isProduction ? '.nejatnkosov.com' : undefined,
            maxAge: 1000 * 60 * 60 * 24 * 7
        })

        return {success: true};
    }

    @Roles(Role.DRIVER, Role.PASSENGER)
    @Patch('updateUserInformation')
    @UseInterceptors(FileInterceptor('profileImage'))
    async updateUserInformation(
        @Req() req: Request,
        @Body() body: UpdateUserInformationDto, 
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({maxSize: 10 * 1024 * 1024}), //10mb
                    new FileTypeValidator({
                        fileType: /(jpg|jpeg|png|gif|webp|bmp|tiff|svg)$/
                    })
                ]
            })
        )
        newImage?: Express.Multer.File
    ){
        const user = req.user as User;
        return await this.authService.updateUserInformation(user.id, body, newImage)
    }

    @Roles(Role.DRIVER, Role.PASSENGER)
    @Patch('updatePassword')
    async updateUserPassword(@Req() req: Request, @Body() body: UpdatePasswordDto){
        const user = req.user as User;
        return await this.authService.updatePassword(user.id, body);
    }

    @Roles(Role.DRIVER, Role.PASSENGER)
    @Get('update-session')
    async updateSession(@Req() req: Request, @Res({passthrough: true}) res: Response){
        const user = req.user as User;
        return await this.authService.updateSession(user.id, res);
    }
    

}
