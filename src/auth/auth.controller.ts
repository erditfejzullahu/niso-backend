import { BadRequestException, Body, Controller, FileTypeValidator, MaxFileSizeValidator, ParseFilePipe, Post, Req, Res, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
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

@Controller('auth')
export class AuthController {
    constructor(
        private prisma: PrismaService,
        private authService: AuthService,
        private uploadService: UploadService
    ){}

    @Public()
    @Post('login')
    async loginUser(@Body() body: LoginUserDto, @Res({passthrough: true}) res: Response){
        await this.authService.login(body.email, body.password, res)
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
        @Body() body: RegisterUserDto, file: Express.Multer.File,
    ){
        return await this.authService.registerUser(body, file);
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
}
