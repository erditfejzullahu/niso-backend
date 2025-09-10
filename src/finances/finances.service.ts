import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { toFixedNoRound } from 'common/utils/toFixed.utils';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FinancesService {
    constructor(
        private readonly prisma: PrismaService
    ){}

    async getDriverFinances(userId: string) { //pasqyra financat ttua
        try {
            const ridesCompleted = await this.prisma.connectedRide.count({
                where: {
                    AND: [
                        {driverId: userId},
                        {status: "COMPLETED"}
                    ]
                }
            })
            
            const earnings = await this.prisma.driverEarning.findMany({
                where: {driverId: userId},
                include: {
                    ride: {
                        include: {
                            rideRequest: true
                        }
                    }
                },
                orderBy: {
                    paymentDate: "desc"
                }
            })

            const paidEarnings = earnings.filter(earning => earning.status === "PAID");
            const pendingEarnings = earnings.filter(earning => earning.status === "PENDING");
            const refundedEarnings = earnings.filter(earning => earning.status === "REFUNDED");

            const totalEarned = paidEarnings.reduce((sum, earning) => {
                return sum + Number(earning.netEarnings)
            }, 0)

            const pendingPayments = pendingEarnings.reduce((sum, earning) => {
                return sum + Number(earning.netEarnings)
            }, 0)

            const refundedPayments = refundedEarnings.reduce((sum, earning) => {
                return sum + Number(earning.netEarnings)
            }, 0)

            const averagePerDrive = ridesCompleted > 0 ? totalEarned / ridesCompleted : 0;

            const recentPayouts = paidEarnings.slice(0,4).map(earning => ({
                id: earning.id,
                date: earning.paymentDate || earning.updatedAt,
                amount: toFixedNoRound(Number(earning.netEarnings), 2)
            }));

            return {
                totalEarned: toFixedNoRound(totalEarned, 2),
                completedDrives: ridesCompleted,
                pendingPayments: toFixedNoRound(pendingPayments, 2),
                refundedPayments: toFixedNoRound(refundedPayments, 2),
                averagePerDrive: toFixedNoRound(averagePerDrive, 2),
                recentPayouts
            }

        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server")
        }
    }

    async getPassengerFinances(userId: string){ //pasqyra financat ttua
        try {
            const ridesCompleted = await this.prisma.connectedRide.count({
                where: {
                    AND: [
                        {driverId: userId},
                        {status: "COMPLETED"}
                    ]
                }
            })

            const payments = await this.prisma.passengerPayment.findMany({
                where: {passengerId: userId},
                include: {
                    ride: {
                        include: {
                            rideRequest: true
                        }
                    }
                },
                orderBy: {
                    paidAt: "desc"
                }
            })

            const paidPayments = payments.filter(payment => payment.status === "PAID");
            const pendingPayments = payments.filter(payment => payment.status === "PENDING");
            const refundedPayments = payments.filter(payment => payment.status === "REFUNDED");

            const totalPayments = paidPayments.reduce((sum, payment) => {
                return sum + Number(payment.totalPaid)
            }, 0)

            const totalPendings = pendingPayments.reduce((sum, payment) => {
                return sum + Number(payment.totalPaid)
            }, 0)

            const totalRefunded = refundedPayments.reduce((sum, payment) => {
                return sum + Number(payment.totalPaid)
            }, 0)

            const averagePerDrive = ridesCompleted > 0 ? totalPayments / ridesCompleted : 0;
            const recentSpents = paidPayments.slice(0,4).map(payment => ({
                id: payment.id,
                date: payment.paidAt || payment.updatedAt,
                amount: toFixedNoRound(Number(payment.totalPaid), 2)
            }))

            return {
                totalSpent: toFixedNoRound(totalPayments, 2),
                completedDrives: ridesCompleted,
                pendingPayments: toFixedNoRound(totalPendings, 2),
                refundedPayments: toFixedNoRound(totalRefunded, 2),
                averagePerDrive: toFixedNoRound(averagePerDrive, 2),
                recentSpents
            }

        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server")
        }
    }

    async getAllDriverEarningList(userId: string){
        try {
            const allDriverEarnings = await this.prisma.driverEarning.findMany({
                where: {driverId: userId},
                select: {
                    id: true,
                    amount: true,
                    fee: true,
                    netEarnings: true,
                    status: true,
                    paymentDate: true,
                    createdAt: true,
                    ride: {
                        select: {
                            id: true,
                            passenger: {
                                select: {
                                    id: true,
                                    fullName: true,
                                    image: true
                                }
                            },
                            status: true,
                            updatedAt: true,
                            rideRequest: {
                                select: {
                                    price: true,
                                    distanceKm: true,
                                    fromAddress: true,
                                    toAddress: true,
                                    isUrgent: true,
                                }
                            }
                        }
                    }
                }
            })

            return allDriverEarnings;
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server")
        }
    }

    async getAllPassengerExpensesList(userId: string){
        try {
            const allDriverEarnings = await this.prisma.passengerPayment.findMany({
                where: {passengerId: userId},
                select: {
                    id: true,
                    amount: true,
                    surcharge: true,
                    totalPaid: true,
                    status: true,
                    paidAt: true,
                    createdAt: true,
                    ride: {
                        select: {
                            id: true,
                            driver: {
                                select: {
                                    id: true,
                                    fullName: true,
                                    image: true
                                }
                            },
                            status: true,
                            updatedAt: true,
                            rideRequest: {
                                select: {
                                    price: true,
                                    distanceKm: true,
                                    fromAddress: true,
                                    toAddress: true,
                                    isUrgent: true,
                                }
                            }
                        }
                    }
                }
            })            

            return allDriverEarnings;
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server")
        }
    }

    async getSpecificFinancialDetail(userId: string, finId: string){

    }
}
