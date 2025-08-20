import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddFixedTarifDto } from './dto/addFixedTarifs.dto';
import { KosovoCity } from '@prisma/client';
import { UpdateFixedTarifDto } from './dto/updateFixedTarifs.dto';

@Injectable()
export class DriversService {
    constructor(
        private readonly prisma: PrismaService
    ){}

    async addFixedTarif(userId: string, fixedTarifDto: AddFixedTarifDto){
        try {
            const user = await this.prisma.user.findUnique({where: {id: userId}})
            if(!user){
                throw new BadRequestException("Nuk u gjet ndonje perdorues, me kete mjet identifikimi.")
            }else{
                await this.prisma.driverFixedTarifs.create({
                    data: {
                        fixedTarifTitle: fixedTarifDto.fixedTarifTitle,
                        city: fixedTarifDto.city as KosovoCity,
                        locationArea: fixedTarifDto.locationArea,
                        price: fixedTarifDto.price,
                        description: fixedTarifDto.description,
                        userId: user.id
                    }
                })
                return {success: true}
            }
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.")
        }
    }

    async updateFixedTarif(userId: string, tarifId: string, fixedTarifDto: UpdateFixedTarifDto){
        try {
            const user = await this.prisma.user.findUnique({where: {id: userId}})
            const tarif = await this.prisma.driverFixedTarifs.findUnique({where: {id: tarifId}});

            
            if(!user || !tarif){
                throw new NotFoundException("Nuk u gjet subjekti i duhur.")
            }else{
                if(tarif.userId !== user.id) throw new ForbiddenException("Nuk keni te drejte per kete veprim.");
                await this.prisma.driverFixedTarifs.update({
                    where: {id: tarifId},
                    data: {
                        fixedTarifTitle: fixedTarifDto.fixedTarifTitle,
                        city: fixedTarifDto.city as KosovoCity,
                        locationArea: fixedTarifDto.locationArea,
                        price: fixedTarifDto.price,
                        description: fixedTarifDto.description,
                        userId: user.id
                    }
                })
                return {success: true}
            }

        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.")
        }
    }

    async deleteFixedTarif(userId: string, tarifId: string){
        try {
            const user = await this.prisma.user.findUnique({where: {id: userId}})
            const tarif = await this.prisma.driverFixedTarifs.findUnique({where: {id: tarifId}});

            if(!user || !tarif){
                throw new BadRequestException("Nuk u gejt subjekti i kerkuar.")
            }else{
                if(user.id !== tarif.userId) throw new ForbiddenException("Ju nuk keni te drejte per kete veprim.");
                await this.prisma.driverFixedTarifs.delete({where: {id: tarifId}});
                return {success: true}
            }
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.")
        }
    }
}
