import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddFixedTarifDto } from './dto/addFixedTarifs.dto';
import { DriverFixedTarifs, KosovoCity, User } from '@prisma/client';
import { UpdateFixedTarifDto } from './dto/updateFixedTarifs.dto';
import { ConversationsGateway } from 'src/conversations/conversations.gateway';

@Injectable()
export class DriversService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly conversationGateway: ConversationsGateway
    ){}

    async getFixedTarifs(userId: string){
        try {
            const fixedTarifs = await this.prisma.driverFixedTarifs.findMany({
                where: {userId}
            })
            return {success: true, fixedTarifs};
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.");
        }
    }

    async addFixedTarif(userId: string, fixedTarifDto: AddFixedTarifDto){
        try {
            const user = await this.prisma.user.findUnique({where: {id: userId}, select: {id: true}})
            if(!user){
                throw new BadRequestException("Nuk u gjet ndonje perdorues, me kete mjet identifikimi.")
            }else{
                const newTarif = await this.prisma.driverFixedTarifs.create({
                    data: {
                        fixedTarifTitle: fixedTarifDto.fixedTarifTitle,
                        city: fixedTarifDto.city as KosovoCity,
                        locationArea: fixedTarifDto.locationArea,
                        price: fixedTarifDto.price,
                        description: fixedTarifDto.description,
                        userId: user.id
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                image: true
                            }
                        }
                    }
                })

                //alert passengers that driver created new tarif in town.
                this.conversationGateway.newTarifCreatedByDriverAlert(newTarif as DriverFixedTarifs & {user: User})

                return {success: true}
            }
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.")
        }
    }

    async updateFixedTarif(userId: string, tarifId: string, fixedTarifDto: UpdateFixedTarifDto){
        try {
            const user = await this.prisma.user.findUnique({where: {id: userId}, select: {id: true}})
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
            const user = await this.prisma.user.findUnique({where: {id: userId}, select: {id: true}})
            const tarif = await this.prisma.driverFixedTarifs.findUnique({where: {id: tarifId}, select: {id: true, userId: true}});

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

    async getAvailableRides(){
        try {
            const availableRides = await this.prisma.rideRequest.findMany({
                where: {status: "WAITING"},
                orderBy: {
                    createdAt: "desc"
                },
                select: {
                    price: true,
                    fromAddress: true,
                    toAddress: true,
                    status: true,
                    createdAt: true,
                    passenger: {
                        select: {
                            fullName: true,
                            image: true,
                        }
                    }
                }
            })

            return {success: true, availableRides}
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server");
        }
    }

    async getRegularClients(userId: string){
        try {
            const user = await this.prisma.user.findUnique({where: {id: userId}, select: {id: true}});
            if(!user) throw new NotFoundException("Nuk u gjet ndonje perdorues me kete mjet identifikimi.");
            
            const groups = await this.prisma.connectedRide.groupBy({
                by: ["passengerId"],
                where: {
                    driverId: user.id,
                    status: "COMPLETED"
                },
                _count: {passengerId: true},
                having: {passengerId: {_count: {gt: 2}}},
                orderBy: {_count: {passengerId: "desc"}},
            })

            const passengerIds = groups.map((g => g.passengerId));
            if(passengerIds.length === 0) return [];

            const passengers = await this.prisma.user.findMany({
                where: {id: {in: passengerIds}},
                select: {id: true, fullName: true, image: true}
            })

            const countMap = new Map(groups.map(g => [g.passengerId, g._count.passengerId]));
            const result = passengers
                .map(p => ({...p, ridesWithDriver: countMap.get(p.id) ?? 0}))
                .sort((a,b) => b.ridesWithDriver - a.ridesWithDriver);
            
            return {success: true, regularClients: result}
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server")
        }
    }
}
