import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNewRideRequestDto } from './dto/createRide.dto';

@Injectable()
export class RideService {
    constructor(
        private readonly prisma: PrismaService
    ){}

    async createNewRideRequestByPassenger(passengerId: string, rideDto: CreateNewRideRequestDto) {
        try {
            const user = await this.prisma.user.findUnique({where: {id: passengerId}, select: {id: true}});
            if(!user) throw new NotFoundException("Perdoruesi nuk u gjet.");

            await this.prisma.rideRequest.create({
                data: {
                    passengerId: user.id,
                    price: rideDto.price,
                    fromAddress: rideDto.fromAddress,
                    toAddress: rideDto.toAddress,
                    status: "WAITING"
                }
            })

            return {success: true}
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.")
        }
    }

    //kur ka ardh offer nga shoferi per udhetim.
    //mund te kete derguar nje qmim tjter apo thjesht kerkese per me tdergu ne qat destinacion.
    async connectRideRequestByPassenger(passengerId: string, messageId: string){
        try {
            const user = await this.prisma.user.findUnique({where: {id: passengerId}, select: {id: true}});
            if(!user) throw new NotFoundException("Nuk u gjet ndonje perdorues.");
            const message = await this.prisma.message.findUnique(
                {
                    where: {id: messageId},
                    include: {
                        conversation: {
                            include: {rideRequest: true}
                        }
                    },
                });

            if(!message) throw new NotFoundException("Nuk u gjet biseda.");
            if(!message.conversation.rideRequest || !message.conversation.rideRequestId) throw new ForbiddenException("Nuk u gjet ndonje kerkese e udhetimit.");


            await this.prisma.$transaction(async (prisma) => {
                const connectedRide = await prisma.connectedRide.create({
                    data: {
                        driverId: message.conversation.driverId,
                        passengerId: user.id,
                        rideRequestId: message.conversation.rideRequestId!,
                        status: "WAITING",
                    }
                })

                //TODO: Logic of passanger completing transaction of payment

                const passengerPaymentPrice = message.priceOffer ? message.priceOffer : message.conversation.rideRequest?.price;
                if(!passengerPaymentPrice) throw new ForbiddenException("Mungon cmimi.");
                const paymentFee = 0.00 //fee from bank or smth
                await prisma.passengerPayment.create({
                    data: {
                        passengerId: user.id,
                        rideId: connectedRide.id,
                        amount: passengerPaymentPrice,
                        surcharge: paymentFee,
                        totalPaid: passengerPaymentPrice + paymentFee.toFixed(2),
                        status: "PAID",
                        paymentMethod: "CARD",
                        paidAt: new Date()
                    }
                })
            })

            return {success: true};

        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.")
        }
    }
}
