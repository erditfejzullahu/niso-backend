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

                // Prices
                const ridePrice = message.priceOffer 
                    ? Number(message.priceOffer) 
                    : Number(message.conversation.rideRequest?.price);

                if (!ridePrice) throw new ForbiddenException("Mungon cmimi.");

                const {ridePriceStr, nisoFeeStr, netEarningsStr, paymentFeeStr, totalPassengerPaid} = this.getRidePrices(ridePrice);
                //TODO: Logic of passanger completing transaction of payment and driver getting money.
                
                //kjo duhet me ndodh ne production veq kur te mbrrin me lokacion
                await prisma.driverEarning.create({
                    data: {
                        driverId: message.conversation.driverId,
                        rideId: connectedRide.id,
                        amount: ridePriceStr,           // string with 2 decimals
                        fee: nisoFeeStr,                // string with 2 decimals
                        netEarnings: netEarningsStr,    // string with 2 decimals
                        status: "PAID",
                        paymentDate: new Date()
                    }
                })

                await prisma.passengerPayment.create({
                    data: {
                        passengerId: user.id,
                        rideId: connectedRide.id,
                        amount: ridePriceStr,                   // string with 2 decimals
                        surcharge: paymentFeeStr,               // string with 2 decimals
                        totalPaid: totalPassengerPaid, // string with 2 decimals
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

    //kur ka ardh offer nga passagjeri per ndryshim cmimi.
    async connectRideRequestByDriver(driverId: string, messageId: string){
        const driver = await this.prisma.user.findUnique({
            where: {id: driverId},
            select: {id: true}
        })
        if(!driver) throw new NotFoundException("Nuk u gjet ndonje shofer.");
        const message = await this.prisma.message.findUnique({
            where: {id: messageId},
            include: {
                conversation: {
                    include: {rideRequest: true}
                }
            }
        })
        if(!message) throw new NotFoundException("Nuk u gjet biseda.");
        if(!message.conversation.rideRequest || !message.conversation.rideRequestId) throw new ForbiddenException("Nuk u gjet ndonje kerkese e udhetimit.");

        await this.prisma.$transaction(async (prisma) => {
            const connectedRide = await prisma.connectedRide.create({
                data: {
                    driverId: driver.id,
                    passengerId: message.conversation.passengerId,
                    rideRequestId: message.conversation.rideRequestId!,
                    status: "WAITING"
                }
            })

            // Prices
            const ridePrice = message.priceOffer
                ? Number(message.priceOffer) 
                : Number(message.conversation.rideRequest?.price);
            if (!ridePrice) throw new ForbiddenException("Mungon cmimi.");
            const {ridePriceStr, nisoFeeStr, netEarningsStr, paymentFeeStr, totalPassengerPaid} = this.getRidePrices(ridePrice);
            //TODO: Logic of passanger completing transaction of payment and driver getting money.

            //kjo duhet me ndodh ne production veq kur te mbrrin me lokacion
            await prisma.driverEarning.create({
                data: {
                    driverId: driver.id,
                    rideId: connectedRide.id,
                    amount: ridePriceStr,           // string with 2 decimals
                    fee: nisoFeeStr,                // string with 2 decimals
                    netEarnings: netEarningsStr,    // string with 2 decimals
                    status: "PAID",
                    paymentDate: new Date()
                }
            })

            await prisma.passengerPayment.create({
                data: {
                    passengerId: message.conversation.passengerId,
                    rideId: connectedRide.id,
                    amount: ridePriceStr,                   // string with 2 decimals
                    surcharge: paymentFeeStr,               // string with 2 decimals
                    totalPaid: totalPassengerPaid, // string with 2 decimals
                    status: "PAID",
                    paymentMethod: "CARD",
                    paidAt: new Date()
                }
            })
        })

        return {success: true};
    }

    private getRidePrices(ridePrice: number) {
        const paymentFee = 0.00; //bank fee or similar
        const nisoFeeThatTakesFromDrivers = Number(process.env.NISO_FEE);

        if (isNaN(nisoFeeThatTakesFromDrivers)) {
            throw new Error("Invalid NISO_FEE value in env");
        }

        // Work in cents
        const ridePriceCents = Math.round(ridePrice * 100);
        const paymentFeeCents = Math.round(paymentFee * 100);
        const nisoFeeCents = Math.round(nisoFeeThatTakesFromDrivers * 100);

        const netEarningsCents = ridePriceCents - nisoFeeCents - paymentFeeCents;

        // Convert back to strings with 2 decimals
        const ridePriceStr = (ridePriceCents / 100).toFixed(2);
        const nisoFeeStr = (nisoFeeCents / 100).toFixed(2);
        const netEarningsStr = (netEarningsCents / 100).toFixed(2);
        const paymentFeeStr = (paymentFeeCents / 100).toFixed(2);

        const totalPassengerPaid = (ridePriceCents + paymentFeeCents) / 100

        return {ridePriceStr, nisoFeeStr, netEarningsStr, paymentFeeStr, totalPassengerPaid};
    }
}
