import { Injectable } from "@nestjs/common";
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
}