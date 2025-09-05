import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { toFixedNoRound } from 'common/utils/toFixed.utils';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PassengersService {
    constructor(
        private readonly prisma: PrismaService
    ){}

    async getPassengerHomeData(userId: string){
        try {
            const [activeRide, allActiveRides, activeDrivers] = await Promise.all([
                this.prisma.connectedRide.findFirst({
                    where: {
                        AND: [
                            { passengerId: userId },
                            {
                            OR: [
                                { status: "DRIVING" },
                                { status: "WAITING" }
                            ]
                            }
                        ]
                    },
                    select: {
                        driver: {
                            select: {
                            fullName: true
                            }
                        },
                    createdAt: true,
                    rideRequest: {
                        select: {
                        fromAddress: true,
                        toAddress: true,
                        price: true,
                        distanceKm: true
                        }
                    },
                    status: true,
                    id: true
                    }
                }),
                this.prisma.connectedRide.count({
                    where: {
                    OR: [
                        { status: "DRIVING" },
                        { status: "WAITING" }
                    ]
                    },
                }),
                this.prisma.$queryRaw<Array<{
                    id: string;
                    fullName: string;
                    image: string | null;
                    createdAt: Date;
                    carModel: string | null;
                    user_verified: boolean;
                    carLicensePlates: string | null;
                    average_rating: number;
                    is_preferred: boolean;
                    why_preferred: string | null;
                }>>`
                    SELECT 
                    u.id,
                    u."fullName",
                    u.image,
                    u."createdAt",
                    u."user_verified",
                    ui."carModel",
                    ui."carLicensePlates",
                    COALESCE(AVG(r.rating), 0) as average_rating,
                    CASE WHEN pd."driverId" IS NOT NULL THEN true ELSE false END as is_preferred,
                    pd."whyPrefered" as why_preferred
                    FROM "User" u
                    LEFT JOIN "UserInformation" ui ON u.id = ui."userId"
                    LEFT JOIN "Reviews" r ON u.id = r."driverId"
                    LEFT JOIN "PreferredDriver" pd ON u.id = pd."driverId" AND pd."passengerId" = ${userId}
                    WHERE u.role = 'DRIVER'
                    GROUP BY u.id, ui."carModel", ui."carLicensePlates", pd."driverId", pd."whyPrefered"
                    ORDER BY is_preferred DESC, average_rating DESC
                `
                ]);

            // Transform the raw SQL result into a more readable format
            const formattedDrivers = activeDrivers.map(driver => ({
                id: driver.id,
                fullName: driver.fullName,
                image: driver.image,
                createdAt: driver.createdAt,
                userVerified: driver.user_verified,
                carInfo: {
                    model: driver.carModel,
                    licensePlates: driver.carLicensePlates
                },
                rating: toFixedNoRound(driver.average_rating, 1),
                isPreferred: driver.is_preferred,
                whyPreferred: driver.why_preferred
            }));

            // Format the active ride data
            const formattedActiveRide = activeRide ? {
                driver: {
                    fullName: activeRide.driver.fullName
                },
                rideInfo: {
                    createdAt: activeRide.createdAt,
                    fromAddress: activeRide.rideRequest.fromAddress,
                    toAddress: activeRide.rideRequest.toAddress,
                    price: activeRide.rideRequest.price,
                    distance: activeRide.rideRequest.distanceKm
                },
                status: activeRide.status,
                id: activeRide.id
            } : null;

            // Return structured response
            return {
                userActiveRide: formattedActiveRide,
                systemStats: {
                    totalActiveRides: allActiveRides
                },
                topAvailableDrivers: formattedDrivers
            };

        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim!");
        }
    }
}
