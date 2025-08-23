import { Injectable } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

@Injectable()
export class UploadService {
    constructor(
        private readonly cloudinaryService: CloudinaryService
    ) {}

    extractPublicIdFromUrl(url: string): string {
        try {
        // Remove the Cloudinary base URL and transformations
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        
        // Find the index after 'upload'
        const uploadIndex = pathParts.indexOf('upload');
        if (uploadIndex === -1) {
            throw new Error('Invalid Cloudinary URL');
        }
        
        // Get everything after 'upload' but skip the version (v1234567)
        const relevantParts = pathParts.slice(uploadIndex + 1);
        
        // Remove version if present (starts with 'v' followed by digits)
        if (relevantParts[0]?.startsWith('v') && /^v\d+$/.test(relevantParts[0])) {
            relevantParts.shift(); // remove version
        }
        
        // Join the remaining parts and remove file extension
        let publicId = relevantParts.join('/');
        
        // Remove file extension
        const lastDotIndex = publicId.lastIndexOf('.');
        if (lastDotIndex !== -1) {
            publicId = publicId.substring(0, lastDotIndex);
        }
        
        return publicId;
        } catch (error) {
        throw new Error('Could not extract publicId from URL: ' + error.message);
        }
    }

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

    async uploadBase64File(base64String: string, folder?: string) {
        try {
            const result = await this.cloudinaryService.uploadBase64File(base64String, folder);
            return {
                success: true,
                data: {
                    uri: result.secure_url,
                    publicId: result.public_id,
                    format: result.format,
                    bytes: result.bytes
                }
            }
        } catch (error) {
            return {success: false, message: error.message};
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

    async uploadMultipleFiles(files: Express.Multer.File[], folder?: string) {
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
