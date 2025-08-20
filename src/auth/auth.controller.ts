import { Body, Controller, FileTypeValidator, MaxFileSizeValidator, ParseFilePipe, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoginUserDto } from './dto/loginUser.dto';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/registerUser.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from 'src/upload/upload.service';

@Controller('auth')
export class AuthController {
    constructor(
        private prisma: PrismaService,
        private authService: AuthService,
        private uploadService: UploadService
    ){}

    @Post('login')
    async loginUser(@Body() body: LoginUserDto, @Res({passthrough: true}) res: Response){
        await this.authService.login(body.email, body.password, res)
    }

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
        
        
    }
}
