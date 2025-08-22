import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNewRideRequestDto } from './dto/createRide.dto';
import { Conversations, Message, RideRequest } from '@prisma/client';
import { SendPriceOfferDto } from './dto/sendPriceOffer.dto';
import { ConnectRideRequestDto } from './dto/connectRideRequest.dto';

interface MessageInterface extends Message {
    conversation: Conversations & {rideRequest?: RideRequest | null}
}

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

    //kur ka ardh offer nga shoferi per udhetim me qat qmim aktual qe passagjeri e ka qit.
    //dmth klikohet butoni prano nga pasagjeri
    async connectRideRequestByPassenger(rideDto: ConnectRideRequestDto){
        try {
            const user = await this.prisma.user.findUnique({where: {id: rideDto.passengerId}, select: {id: true}});
            if(!user) throw new NotFoundException("Nuk u gjet ndonje perdorues.");
            const messages = await this.prisma.message.findMany(
            {
                where: {
                    AND: [
                        {id: rideDto.messageId},
                        {conversation: {driverId: rideDto.driverId}},
                        {conversation: {passengerId: rideDto.passengerId}}
                    ]
                },
                include: {
                    conversation: {
                        include: {rideRequest: true}
                    }
                },
            });
            
            if(!messages || messages.length === 0) throw new NotFoundException("Nuk u gjeten bisedat.");
            let message: MessageInterface | null = null;
            let findMessageIndex: number = -1;

            // Find both the message and its index in one loop
            for (let i = 0; i < messages.length; i++) {
                if (messages[i].id === rideDto.messageId) {
                    message = messages[i];
                    findMessageIndex = i;
                    break; // Exit loop early once found
                }
            }
            if (!message) throw new NotFoundException("Nuk u gjet biseda.");
            // Check if it's NOT the last message
            if (findMessageIndex !== messages.length - 1) throw new ForbiddenException("Nuk eshte oferta e fundit.");
            
            if(!message.conversation.rideRequest || !message.conversation.rideRequestId || message.conversation.isResolved) throw new ForbiddenException("Nuk u gjet ndonje kerkese e udhetimit.");

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

    //kur ka ardh offer nga passagjeri per ndryshim cmimi pasi qe pasagjeri ka ofru ndryshim ne qmim edhe shoferi e pranon.
    //dmth klikohet butoni prano nga shoferi
    async connectRideRequestByDriver(rideDto: ConnectRideRequestDto){
        const driver = await this.prisma.user.findUnique({
            where: {id: rideDto.driverId},
            select: {id: true}
        })
        if(!driver) throw new NotFoundException("Nuk u gjet ndonje shofer.");
        const messages = await this.prisma.message.findMany({
            where: {
                AND: [
                    {id: rideDto.messageId},
                    {conversation: {driverId: rideDto.driverId}},
                    {conversation: {passengerId: rideDto.passengerId}}
                ]
            },
            include: {
                conversation: {
                    include: {rideRequest: true}
                }
            }
        })
        
        if(!messages || messages.length === 0) throw new NotFoundException("Nuk u gjeten bisedat.");
        let message: MessageInterface | null = null;
        let findMessageIndex: number = -1;

        // Find both the message and its index in one loop
        for (let i = 0; i < messages.length; i++) {
            if (messages[i].id === rideDto.messageId) {
                message = messages[i];
                findMessageIndex = i;
                break; // Exit loop early once found
            }
        }
        if (!message) throw new NotFoundException("Nuk u gjet biseda.");
        // Check if it's NOT the last message
        if (findMessageIndex !== messages.length - 1) throw new ForbiddenException("Nuk eshte oferta e fundit.");

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


    //negociata te qmimit

    //passagjeri dergon oferten e qmimit te tij per me kundershtu qmimin e shoferit(qe shoferi e ka dergu me kundershtu qmimin e pasagjerit)
    async sendPriceOfferFromPassengerToDriver(offerDto: SendPriceOfferDto){
        try {
            const passenger = await this.prisma.user.findUnique({where: {id: offerDto.passengerId}, select: {id: true, role: true}});
            if(!passenger) throw new NotFoundException("Nuk u gjet pasagjeri.");
            
            const conversation = await this.prisma.conversations.findFirst({
                where: {
                    AND: [
                        {id: offerDto.conversationId},
                        {passengerId: offerDto.passengerId},
                        {driverId: offerDto.driverId}
                    ]
                },
                include: {rideRequest: true}
            });
            if(!conversation) throw new NotFoundException("Biseda nuk u gjet.");
            const newOfferMessage = await this.prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    senderId: passenger.id,
                    senderRole: passenger.role,
                    content: offerDto.content ?? "Oferte e re.",
                    priceOffer: offerDto.priceOffer,
                    isRead: false
                }
            })
            //logic to notify the driver realtime
            return {success: true};

        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.");
        }
    }

    //shoferi dergon oferten e qmimit te tij per me kundershtu qmimin e pasagjerit(qe pasagjeri e ka dergu me kundershtu qmimin e pasagjerit, ose qmimin fillestar te udhetimit)
    async sendPriceOfferFromDriverToPassenger(offerDto: SendPriceOfferDto){
        try {
            const driver = await this.prisma.user.findUnique({where: {id: offerDto.driverId}, select: {id: true, role: true}});
            if(!driver) throw new NotFoundException("Nuk u gjet pasagjeri.");

            const conversation = await this.prisma.conversations.findFirst({
                where: {
                    AND: [
                        {id: offerDto.conversationId},
                        {passengerId: offerDto.passengerId},
                        {driverId: offerDto.driverId}
                    ]
                },
                include: {rideRequest: true}
            });
            if(!conversation) throw new NotFoundException("Biseda nuk u gjet.");
            const newOfferMessage = await this.prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    senderId: driver.id,
                    senderRole: driver.role,
                    content: offerDto.content ?? "Oferte e re.",
                    priceOffer: offerDto.priceOffer,
                    isRead: false
                }
            })
            //logic to notify the driver realtime
            return {success: true};
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.")
        }
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
