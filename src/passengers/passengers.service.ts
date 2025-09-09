import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { toFixedNoRound } from 'common/utils/toFixed.utils';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetAllDriversDtoFilters } from './dto/getAllDrivers.dto';
import { sanitizeContent } from 'common/utils/sanitize.utils';
import { AddPreferredDriverDto } from './dto/addPreferredDriver.dto';

@Injectable()
export class PassengersService {
    constructor(
        private readonly prisma: PrismaService
    ){}

    async getPassengerHomeData(userId: string){
        try {
            const sanitizeUserId = sanitizeContent(userId);
            const [activeRide, allActiveRides, activeDrivers] = await Promise.all([
                this.prisma.connectedRide.findFirst({
                    where: {
                        AND: [
                            { passengerId: sanitizeUserId },
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
                    LEFT JOIN "PreferredDriver" pd ON u.id = pd."driverId" AND pd."passengerId" = ${sanitizeUserId}
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

    async getAllDrivers(userId: string, allDriversDto: GetAllDriversDtoFilters) {
        try {
            if ((allDriversDto.sortBy && !allDriversDto.sortOrder) || (!allDriversDto.sortBy && allDriversDto.sortOrder)) {
                throw new BadRequestException("Paraqitni te dhenat filtruese ne menyre te duhur.");
            }

            const {
                page,
                limit,
                driverFilters,
                sortBy,
                sortOrder,
                searchParam
            } = allDriversDto;

            // Build WHERE clause with parameterized queries
            let whereClause = `WHERE u.role = 'DRIVER'`;
            const queryParams: any[] = [];
            let paramIndex = 0;

            if (driverFilters === 'favorite') {
                whereClause += ` AND pd."driverId" IS NOT NULL`;
            }

            // Add search parameter filter if provided
            if (searchParam) {
                paramIndex++;
                whereClause += ` AND (u."fullName" ILIKE $${paramIndex} OR ui."carModel" ILIKE $${paramIndex} OR ui."carLicensePlates" ILIKE $${paramIndex})`;
                queryParams.push(`%${searchParam}%`);
            }

            // Build ORDER BY clause based on sort options
            let orderByClause = 'ORDER BY is_preferred DESC';
            
            if (sortBy) {
                const sortDirection = sortOrder?.toUpperCase() || 'DESC';
                
                switch (sortBy) {
                    case 'name':
                        orderByClause += `, u."fullName" ${sortDirection}`;
                        break;
                    case 'rating':
                        orderByClause += `, average_rating ${sortDirection}`;
                        break;
                    case 'createdAt':
                        orderByClause += `, u."createdAt" ${sortDirection}`;
                        break;
                    default:
                        orderByClause += ', average_rating DESC';
                }
            } else {
                orderByClause += ', average_rating DESC';
            }

            // Build the main query with proper parameter handling
            const mainQuery = `
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
                LEFT JOIN "PreferredDriver" pd ON u.id = pd."driverId" AND pd."passengerId" = $${paramIndex + 1}
                ${whereClause}
                GROUP BY u.id, ui."carModel", ui."carLicensePlates", pd."driverId", pd."whyPrefered"
                ${orderByClause}
                LIMIT $${paramIndex + 2} OFFSET $${paramIndex + 3}
            `;

            // Add remaining parameters
            queryParams.push(userId, limit, allDriversDto.getSkip());

            const drivers = await this.prisma.$queryRawUnsafe<Array<{
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
            }>>(mainQuery, ...queryParams);

            // Build count query
            const countQuery = `
                SELECT COUNT(DISTINCT u.id) as count
                FROM "User" u
                LEFT JOIN "UserInformation" ui ON u.id = ui."userId"
                LEFT JOIN "PreferredDriver" pd ON u.id = pd."driverId" AND pd."passengerId" = $${paramIndex + 1}
                ${whereClause}
            `;

            // Use only the search params + userId for count query
            const countParams = searchParam 
                ? [...queryParams.slice(0, -3), userId] 
                : [userId];
            
            const totalCountResult = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
                countQuery, 
                ...countParams
            );

            const totalCount = Number(totalCountResult[0]?.count || 0);
            const totalPages = Math.ceil(totalCount / limit);
            const hasMore = page < totalPages;

            const formatDrivers = drivers.map((driver) => ({
                id: driver.id,
                fullName: driver.fullName,
                image: driver.image,
                createdAt: driver.createdAt,
                userVerified: driver.user_verified,
                carInfo: {
                    model: driver.carModel,
                    licensePlates: driver.carLicensePlates
                },
                rating: Number(driver.average_rating),
                isPreferred: driver.is_preferred,
                whyPreferred: driver.why_preferred
            }));

            return {
                drivers: formatDrivers,
                hasMore,
                totalCount,
                totalPages,
                currentPage: page
            };
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server");
        }
    }

    async getPreferredDrivers(userId: string, favoriteDrivers: "add" | "favorites"){
        try {
            if(favoriteDrivers === "favorites"){
                const preferredDrivers = await this.prisma.preferredDriver.findMany({
                    where: {
                        passengerId: userId
                    },
                    select: {
                        id: true,
                        driver: {
                            select: {
                                id: true,
                                fullName: true,
                                image: true,
                                user_verified: true,
                                createdAt: true,
                                userInformation: {
                                    select: {
                                        carModel: true,
                                        carLicensePlates: true
                                    }
                                },
                                driverReviews: {
                                    select: {
                                        rating: true
                                    },
                                },
                            }
                        },
                        whyPrefered: true
                    }
                })
    
                const preferredDriversWithRatings = preferredDrivers.map(preferredDriver => {
                    const reviews = preferredDriver.driver.driverReviews;
                    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
                    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
    
                    return {
                        id: preferredDriver.driver.id,
                        fullName: preferredDriver.driver.fullName,
                        image: preferredDriver.driver.image,
                        createdAt: preferredDriver.driver.createdAt,
                        userVerified: preferredDriver.driver.user_verified,
                        carInfo: {
                            model: preferredDriver.driver.userInformation?.carModel,
                            licensePlates: preferredDriver.driver.userInformation?.carLicensePlates,
                        },
                        rating: averageRating,
                        isPreferred: true,
                        whyPreferred: preferredDriver.whyPrefered,
                        preferredId: preferredDriver.id
                    }
                })

                return preferredDriversWithRatings;
            }else if (favoriteDrivers === "add"){
                const drivers = await this.prisma.connectedRide.findMany({
                    where: {
                        AND: [
                            {status: "COMPLETED"},
                            {passengerId: userId},
                            {
                                driver: {
                                    preferredByUsers: {
                                        none: {
                                            passengerId: userId
                                        }
                                    }
                                }
                            }
                        ]
                    },
                    select: {
                        driver: {
                            select: {
                                id: true,
                                fullName: true,
                                image: true,
                                createdAt: true,
                                user_verified: true,
                                userInformation: {
                                    select: {
                                        carModel: true,
                                        carLicensePlates: true
                                    }
                                },
                                driverReviews: {
                                    select: {
                                        rating: true
                                    }
                                },
                                
                            }
                        }
                    },
                    distinct: ['driverId']
                })

                const toAddPreferredDriversWithRatings = drivers.map(driver => {
                    const reviews = driver.driver.driverReviews;
                    const totalRating = reviews.reduce((sum, review) => sum + review.rating ,0)
                    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

                    return {
                        id: driver.driver.id,
                        fullName: driver.driver.fullName,
                        image: driver.driver.image,
                        createdAt: driver.driver.createdAt,
                        userVerified: driver.driver.user_verified,
                        carInfo: {
                            model: driver.driver.userInformation?.carModel,
                            licensePlates: driver.driver.userInformation?.carLicensePlates,
                        },
                        rating: averageRating,
                        isPreferred: false,
                        whyPreferred: null,
                        preferredId: null
                    }
                })

                return toAddPreferredDriversWithRatings;
            }else{
                throw new BadRequestException("Parametri nuk eshte ne rregull.");
            }
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.")
        }
    }


    async addPreferredDriverByPassenger(userId: string, preferredDto: AddPreferredDriverDto) {
        try {
            const getSpecificPreferred = await this.prisma.preferredDriver.findFirst({
                where: {
                    AND: [
                        {passengerId: userId},
                        {driverId: preferredDto.driverId}
                    ]
                },
                select: {id: true}
            })

            const connectedRide = await this.prisma.connectedRide.findFirst({
                where: {
                    AND: [
                        {passengerId: userId},
                        {status: "COMPLETED"},
                        {driverId: preferredDto.driverId}
                    ]
                },
                select: {
                    id: true
                }
            })

            if(getSpecificPreferred) throw new BadRequestException("Ju vecse keni shtuar kete te preferuar.");
            if(!connectedRide) throw new ForbiddenException("Nuk mund te shtosh kete shofer qe nuk keni udhetuar bashke.");
            
            await this.prisma.preferredDriver.create({
                data: {
                    passengerId: userId,
                    driverId: preferredDto.driverId,
                    whyPrefered: preferredDto.whyPreferred
                }
            })

            return {success: true};
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.")
        }
    }

    async deletePreferredDriverByPassenger(userId: string, preferredDriverId: string){
        try {
            const preferredDriver = await this.prisma.preferredDriver.findUnique({where: {id: preferredDriverId}});
            if(!preferredDriver) throw new NotFoundException("Nuk u gjet shoferi favorit i ruajtur.");
            if(preferredDriver.passengerId !== userId) throw new ForbiddenException("Ju nuk keni drejte per kryerjen e ketij veprimi.");
            await this.prisma.preferredDriver.delete({
                where: {id: preferredDriverId}
            })
            return {success: true};
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server.")
        }
    }
}
