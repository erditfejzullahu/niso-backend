import { BadRequestException, Injectable } from "@nestjs/common";
import { UploadApiErrorResponse, UploadApiResponse } from "cloudinary";
import {v2 as cloudinary} from "cloudinary"

@Injectable()
export class CloudinaryService {
    async uploadFile(file: Express.Multer.File, folder?: string): Promise<UploadApiResponse | UploadApiErrorResponse> {
        return new Promise((resolve, reject) => {
            const uploadOptions: any = {};
            if(folder) {
                uploadOptions.folder = folder;
            }

            cloudinary.uploader
                .upload_stream(uploadOptions, (error, result) => {
                    if(error) return reject(error);
                    resolve(result!);
                })
                .end(file.buffer)
        })
    }

    async uploadBase64File(
        base64String: string,
        folder?: string,
    ): Promise<UploadApiResponse | UploadApiErrorResponse>{
        try {
            if(!this.isValidBase64(base64String)){
                throw new BadRequestException("Invalid base64 string format");
            }

            return await cloudinary.uploader.upload(base64String, {folder});
        } catch (error) {
            console.error('failed to upload base64 file ', error.message);
            throw new BadRequestException(`Failed yo upload base64 file`);
        }
    }

    async uploadFileFromPath(filePath: string, folder?: string): Promise<UploadApiErrorResponse | UploadApiResponse>{
        const uploadOptions: any = {}
        if(folder){
            uploadOptions.folder = folder;
        }

        return cloudinary.uploader.upload(filePath, uploadOptions)
    }

    async deleteFile(publicId: string): Promise<any> {
        return cloudinary.uploader.destroy(publicId);
    }

    async deleteFiles(publicIds: string[]): Promise<any> {
        return cloudinary.api.delete_resources(publicIds)
    }

    async getFileInfo(publicId: string): Promise<any> {
        return cloudinary.api.resource(publicId)
    }

    private isValidBase64(str: string): boolean {
    try {
      // Check if it's a data URL format (data:image/png;base64,...)
      if (str.includes('data:')) {
        const matches = str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return false;
        }
        // Check if the base64 part is valid
        const base64Data = matches[2];
        return Buffer.from(base64Data, 'base64').toString('base64') === base64Data;
      }
      
      // Check if it's pure base64
      return Buffer.from(str, 'base64').toString('base64') === str;
    } catch (error) {
      return false;
    }
  }
}