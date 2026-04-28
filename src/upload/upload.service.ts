import { Injectable } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

@Injectable()
export class UploadService {
    constructor(
        private readonly cloudinaryService: CloudinaryService
    ) {}

    /**
     * Returns Cloudinary public_id or null if URL is missing, invalid, or not a delivery URL
     * (e.g. OAuth avatar, placeholder, or non-Cloudinary host).
     */
    tryExtractPublicIdFromUrl(url: string | null | undefined): string | null {
        if (!url || typeof url !== 'string' || !url.trim()) {
            return null;
        }
        try {
            const urlObj = new URL(url.trim());
            const marker = '/upload/';
            const m = urlObj.pathname.indexOf(marker);
            if (m === -1) {
                return null;
            }
            const afterUpload = urlObj.pathname.slice(m + marker.length);
            if (!afterUpload) {
                return null;
            }
            const segments = afterUpload.split('/').filter(Boolean);
            let i = 0;
            while (i < segments.length && segments[i].includes(',')) {
                i++;
            }
            if (i < segments.length && /^v\d+$/i.test(segments[i])) {
                i++;
            }
            if (i >= segments.length) {
                return null;
            }
            let publicId = segments.slice(i).join('/');
            const lastDot = publicId.lastIndexOf('.');
            if (lastDot !== -1) {
                publicId = publicId.substring(0, lastDot);
            }
            return publicId || null;
        } catch {
            return null;
        }
    }

    extractPublicIdFromUrl(url: string): string {
        const publicId = this.tryExtractPublicIdFromUrl(url);
        if (!publicId) {
            throw new Error('Invalid Cloudinary URL');
        }
        return publicId;
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
