import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNewRideRequestDto } from './dto/createRide.dto';
import { Conversations, Message, RideRequest, User, UserInformation } from '@prisma/client';
import { SendPriceOfferDto } from './dto/sendPriceOffer.dto';
import { ConnectRideRequestDto } from './dto/connectRideRequest.dto';
import { FinishRideManuallyByDriverDto } from './dto/finishRideManuallyByDriver.dto';
import { ConversationsGatewayServices } from 'src/conversations/conversations.gateway-services';

interface MessageInterface extends Message {
    conversation: Conversations & {rideRequest?: RideRequest | null}
}

@Injectable()
export class RideService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly conversationGateway: ConversationsGatewayServices
    ){}

    async createNewRideRequestByPassenger(passengerId: string, rideDto: CreateNewRideRequestDto) {
        try {
            const user = await this.prisma.user.findUnique({where: {id: passengerId}, select: {id: true, fullName: true, image: true, userInformation: {select: {city: true}}}});
            if(!user) throw new NotFoundException("Perdoruesi nuk u gjet.");

            await this.prisma.$transaction(async (prisma) => {
                const newRideRequest = await prisma.rideRequest.create({
                    data: {
                        passengerId: user.id,
                        price: rideDto.price,
                        fromAddress: rideDto.fromAddress,
                        toAddress: rideDto.toAddress,
                        status: "WAITING",
                        distanceCalculatedPriceRide: false,
                        distanceKm: 0 //logic to calculate the km fromaddress to toaddress
                    }
                })

                const newNotification = await prisma.notification.create({
                    data: {
                        userId: user.id,
                        title: "Njoftim mbi udhëtim",
                        message: "Sapo keni krijuar një kërkesë për udhëtim me sukses",
                        type: "RIDE_UPDATE",
                        read: false,
                        metadata: JSON.stringify({modalAction: true, rideRequest: newRideRequest})
                    }
                })
    
                this.conversationGateway.createdRideRequestAlertToDrivers(newRideRequest, user as Partial<User & {userInformation: UserInformation}>, newNotification);
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

                await prisma.notification.create({
                    data: {
                        userId: message.conversation.driverId,
                        title: "Njoftim financiar",
                        message: `Ju keni fituar ${netEarningsStr}€. Kontrolloni pasqyrën finananciare tek shiriti poshtë.`,
                        type: "PAYMENT",
                        read: false,
                    }
                })
                this.conversationGateway.counterUpdaterToUserAlert(message.conversation.driverId)

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
                
                await prisma.notification.create({
                    data: {
                        userId: user.id,
                        title: "Njoftim financiar",
                        message: `Ju keni shpenzuar ${totalPassengerPaid}€. Kontrolloni pasqyrën financiare tek shiriti poshtë.`,
                        type: "PAYMENT",
                        read: false
                    }
                })

                this.conversationGateway.counterUpdaterToUserAlert(user.id, null)


            })

            this.conversationGateway.passagerAcceptedDriverPriceOfferAlert(rideDto.driverId);

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

            await prisma.notification.create({
                data: {
                    userId: driver.id,
                    title: "Njoftim financiar",
                    message: `Ju keni shpenzuar ${totalPassengerPaid}€. Kontrolloni pasqyrën financiare tek shiriti poshtë.`,
                    type: "PAYMENT",
                    read: false
                }
            })
            this.conversationGateway.counterUpdaterToUserAlert(driver.id)


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
            
            await prisma.notification.create({
                data: {
                    userId: message.conversation.passengerId,
                    title: "Njoftim financiar",
                    message: `Ju keni shpenzuar ${totalPassengerPaid}€. Kontrolloni pasqyrën financiare tek shiriti poshtë.`,
                    type: "PAYMENT",
                    read: false
                }
            })
            this.conversationGateway.counterUpdaterToUserAlert(message.conversation.driverId)

        })

        this.conversationGateway.driverAcceptedPassengerPriceOfferAlert(rideDto.passengerId)

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
                include: {rideRequest: true,
                },
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
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            image: true,
                            fullName: true
                        }
                    }
                }
            })
            //logic to notify the driver realtime
            this.conversationGateway.passengerSendsPriceOfferToDriverAlert(conversation.driverId, newOfferMessage as Message & {sender: User});
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
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            image: true,
                            fullName: true
                        }
                    }
                }
            })
            //logic to notify the driver realtime
            this.conversationGateway.driverSendsPriceOfferToPassengerAlert(conversation.passengerId, newOfferMessage as Message & {sender: User})
            return {success: true};
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.")
        }
    }


    //complete ride by driver
    async completeRideManuallyByDriver(driverId: string, rideDto: FinishRideManuallyByDriverDto){
        try {
            const driver = await this.prisma.user.findUnique({where:{id: driverId}, select: {id: true}});
            if(!driver) throw new NotFoundException("Nuk u gjet shoferi.");

            const connectedRide = await this.prisma.connectedRide.findUnique({where: {id: rideDto.connectedRideId}, include: {rideRequest: true, driver: {select: {id: true, fullName: true, image:true}}}});
            if(!connectedRide) throw new NotFoundException("Nuk u gjet udhetimi.");
            if(connectedRide.driverId !== driver.id) throw new ForbiddenException("Ju nuk jeni te lejuar per te kryer kete veprim.");
            
            //logjika per me kqyr a osht afer from address dhe to address e ride requestit
            //me lokacionin egzakt te shoferit.

            const driverLocation = rideDto.driverExactLatitude;
            if(connectedRide.rideRequest.toAddress !== driverLocation){
                //refund the driver money received.

                await this.prisma.$transaction(async (prisma) => {
                    await prisma.connectedRide.update({
                        where: {id: connectedRide.id},
                        data: {
                            status: "CANCELLED_BY_DRIVER"
                        }
                    })
                    
                    await prisma.rideRequest.update({
                        where: {id: connectedRide.rideRequestId},
                        data: {
                            status: "CANCELLED",
                        }
                    })

                    await prisma.notification.create({
                        data: {
                            userId: connectedRide.passengerId,
                            title: "Udhëtimi u përfundua",
                            message: `Shoferi ${connectedRide.driver.fullName} përfundoi udhëtimin. Shiko detajet dhe ndërvepro.`,
                            type: "RIDE_UPDATE",
                            metadata: JSON.stringify({modalAction: false, notificationSender: connectedRide.driver, navigateAction: {connectedRide: connectedRide.id}})
                        }
                    })
                })

            }else{

                await this.prisma.$transaction(async (prisma) => {
                    await prisma.connectedRide.update({
                        where: {id: connectedRide.id},
                        data: {
                            status: "COMPLETED"
                        }
                    })
    
                    await prisma.rideRequest.update({
                        where: {id: connectedRide.rideRequestId},
                        data: {
                            status: "COMPLETED",
                        }
                    })

                    await prisma.notification.create({
                        data: {
                            userId: connectedRide.passengerId,
                            title: "Udhëtimi u përfundua",
                            message: `Shoferi ${connectedRide.driver.fullName} përfundoi udhëtimin. Shiko detajet dhe ndërvepro.`,
                            type: "RIDE_UPDATE",
                            metadata: JSON.stringify({modalAction: false, notificationSender: connectedRide.driver, navigateAction: {connectedRide: connectedRide.id}})
                        }
                    })
                })
            }

            this.conversationGateway.counterUpdaterToUserAlert(connectedRide.passengerId);
            this.conversationGateway.completedRideByDriverAlert(connectedRide.passengerId, connectedRide.driverId, connectedRide.id)
            return {success: true}
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.")
        }
    }

    //cancel ride by passenger
    async cancelRideManuallyByPassenger(passengerId: string, connectedRideId: string){
        try {
            const passenger = await this.prisma.user.findUnique({where: {id: passengerId}, select: {id: true}})
            if(!passenger) throw new NotFoundException("Nuk u gjet pasagjeri.");

            const connectedRide = await this.prisma.connectedRide.findUnique({where: {id: connectedRideId}, include: {rideRequest: true, passenger: {select: {id: true, fullName: true, image: true}}}});
            if(!connectedRide) throw new NotFoundException("Nuk u gjet udhetimi.");
            if(connectedRide.passengerId !== passenger.id) throw new ForbiddenException("Ju nuk jeni te lejuar per te kryer kete veprim.");

            //logic to refund
            await this.prisma.$transaction(async (prisma) => {
                await prisma.connectedRide.update({
                    where: {id: connectedRide.id},
                    data: {
                        status: "CANCELLED_BY_PASSENGER"
                    }
                })
    
                await prisma.rideRequest.update({
                    where: {id: connectedRide.rideRequestId},
                    data: {
                        status: "CANCELLED",
                    }
                })
                await prisma.notification.create({
                    data: {
                        userId: connectedRide.passengerId,
                        title: "Udhëtimi u përfundua",
                        message: `Pasagjeri ${connectedRide.passenger.fullName} përfundoi udhëtimin. Shiko detajet dhe ndërvepro.`,
                        type: "RIDE_UPDATE",
                        metadata: JSON.stringify({modalAction: false, notificationSender: connectedRide.passenger, navigateAction: {connectedRide: connectedRide.id}})
                    }
                })
            })

            this.conversationGateway.counterUpdaterToUserAlert(connectedRide.driverId)
            this.conversationGateway.cancelRideManuallyByPassengerAlert(connectedRide.driverId, connectedRide.passengerId, connectedRide.id)
            return {success: true}
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.")
        }
    }


    //start ride by driver when driver and passenger gets in car to drive
    async startRideManuallyByDriver(driverId: string, connectedRideId: string){
        const driver = await this.prisma.user.findUnique({where: {id: driverId}, select: {id: true, fullName: true}});
        if(!driver) throw new NotFoundException("Nuk u gjet shoferi.");
        const connectedRide = await this.prisma.connectedRide.findUnique({where: {id: connectedRideId}, include: {rideRequest: true, passenger: {select: {fullName: true, id: true}}}});
        if(!connectedRide) throw new NotFoundException("Nuk u gjet udhetimi.");
        if(connectedRide.driverId !== driver.id) throw new ForbiddenException("Ju nuk jeni te lejuar per te kryer kete veprim.");

        this.prisma.$transaction(async (prisma) => {
            await prisma.connectedRide.update({
                where: {id: connectedRide.id},
                data: {
                    status: "DRIVING"
                }
            })

            await prisma.notification.create({
                data: {
                    userId: connectedRide.driverId,
                    title: "Udhëtimi filloi!",
                    message: `Udhëtimi juaj me pasagjerin ${connectedRide.passenger.fullName} filloi! Do të njoftoheni për rifreskime të reja.`,
                    type: "RIDE_UPDATE"
                }
            })
            await prisma.notification.create({
                data: {
                    userId: connectedRide.passengerId,
                    title: "Udhëtimi filloi!",
                    message: `Udhëtimi juaj me shoferin ${driver.fullName} filloi! Do të njoftoheni për rifreskime të reja.`,
                    type: "RIDE_UPDATE"
                }
            })
        })

        this.conversationGateway.counterUpdaterToUserAlert(driver.id)
        this.conversationGateway.counterUpdaterToUserAlert(connectedRide.passenger.id)

        return {success: true}
    }


    //start ride manually by driver


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
