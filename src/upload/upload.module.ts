import { Module } from '@nestjs/common';
import { CloudinaryProvider } from './cloudinary.provider';
import { UploadService } from './upload.service';
import { CloudinaryService } from './cloudinary.service';

@Module({
    providers: [CloudinaryProvider, UploadService, CloudinaryService]
})
export class UploadModule {}
