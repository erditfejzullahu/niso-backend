import { Injectable } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

@Injectable()
export class UploadService {
    constructor(
        private readonly cloudinaryService: CloudinaryService
    ) {}

    async uploadFile(file: Express.Multer.File, folder?: string) {
        try {
            const result = await this.cloudinaryService.uploadFile(file, folder);
            return {
                success: true,
                data: {
                    url: result.secure_url,
                    publicId: result.public_id,
                    format: result.format,
                    bytes: result.bytes
                }
            }
        } catch (error) {
            return {
                success: false,
                message: error.message
            }
        }
    }

    async uploadFileFromPath(filePath: string, folder?: string){
        try {
            const result = await this.cloudinaryService.uploadFileFromPath(filePath, folder)
            return {
                success: true,
                data: {
                    url: result.secure_url,
                    publicId: result.public_id,
                    format: result.format,
                    bytes: result.bytes
                }
            }
        } catch (error) {
            console.error(error);
            return {success: false, message: error.message}
        }
    }

    async uploadMultipleFiled(files: Express.Multer.File[], folder?: string) {
        const uploadPromises = files.map(file => this.uploadFile(file, folder));

        const result = await Promise.all(uploadPromises);
        return result;
    }

    async deleteFile(publicId: string) {
        try {
            await this.cloudinaryService.deleteFile(publicId);
            return {success: true}
        } catch (error) {
            console.log(error);
            return {success: false}
        }
    }

    async deleteFiles(publicIds: string[]) {
        try {
            await this.cloudinaryService.deleteFiles(publicIds);
            return {success: true}
        } catch (error) {
            return {success: false}
        }
    }
}
