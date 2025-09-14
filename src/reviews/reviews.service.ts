import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto } from './dto/createReview.dto';

@Injectable()
export class ReviewsService {
    constructor(
        private readonly prisma: PrismaService
    ){}

    async getAllReviewsByDriver(userId: string) {
        try {
            const reviews = await this.prisma.reviews.findMany({
                where: {driverId: userId},
                select: {
                    id: true,
                    comment: true,
                    rating: true,
                    createdAt: true,
                    connectedRide: {
                        select: {
                            rideRequest: {
                                select: {
                                    price: true,
                                    distanceKm: true,
                                    fromAddress: true,
                                    toAddress: true,
                                    isUrgent: true,
                                    createdAt: true,
                                    updatedAt: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                },
            })

            const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
            const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

            return {
                averageRating, 
                totalReviews: reviews.length,
                reviews: reviews.map(review => ({
                    id: review.id,
                    rating: review.rating,
                    comment: review.comment,
                    createdAt: review.createdAt,
                    ride: {
                        price: review.connectedRide.rideRequest.price,
                        distanceKm: review.connectedRide.rideRequest.distanceKm,
                        fromAddress: review.connectedRide.rideRequest.fromAddress,
                        toAddress: review.connectedRide.rideRequest.toAddress,
                        isUrgent: review.connectedRide.rideRequest.isUrgent,
                        updatedAt: review.connectedRide.rideRequest.updatedAt
                    }
                }))
            }

        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server")
        }
    }

    async getAllReviewsByPassenger(userId: string) {
        try {
            const reviews = await this.prisma.reviews.findMany({
                where: {passengerId: userId},
                select: {
                    id: true,
                    comment: true,
                    rating: true,
                    createdAt: true,
                    driver: {
                        select: {
                            id: true,
                            fullName: true,
                            image: true
                        }
                    },
                    connectedRide: {
                        select: {
                            rideRequest: {
                                select: {
                                    price: true,
                                    distanceKm: true,
                                    fromAddress: true,
                                    toAddress: true,
                                    isUrgent: true,
                                    createdAt: true,
                                    updatedAt: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                }
            })

            return {
                reviews: reviews.map(review => ({
                    id: review.id,
                    rating: review.rating,
                    comment: review.comment,
                    createdAt: review.createdAt,
                    ride: {
                        price: review.connectedRide.rideRequest.price,
                        distanceKm: review.connectedRide.rideRequest.distanceKm,
                        fromAddress: review.connectedRide.rideRequest.fromAddress,
                        toAddress: review.connectedRide.rideRequest.toAddress,
                        isUrgent: review.connectedRide.rideRequest.isUrgent,
                        updatedAt: review.connectedRide.rideRequest.updatedAt
                    }
                })),
            }

        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server")
        }
    }

    async deleteReviewByPassenger(userId: string, reviewId: string){
        try {
            const review = await this.prisma.reviews.findUnique({where: {id: reviewId}});
            if(!review) throw new NotFoundException("Nuk u gjet vleresimi.");
            if(review.passengerId !== userId) throw new ForbiddenException("Nuk jeni te lejuar per kryerjen e ketij veprimi.");

            await this.prisma.reviews.delete({where: {id: reviewId}});
            return {success: true};
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server")
        }
    }

    async makeReviewAgainstDriver(userId: string, reviewDto: CreateReviewDto){
        try {
            const connectedRide = await this.prisma.connectedRide.findUnique({
                where: {id: reviewDto.connectedRideId}
            })

            if(!connectedRide) throw new NotFoundException("Nuk u gjet udhetimi.");

            if((connectedRide.passengerId !== userId) || (connectedRide.driverId !== reviewDto.driverId)) throw new ForbiddenException("Ju nuk keni te drejte per kryerjen e ketij veprimi.");

            await this.prisma.reviews.create({
                data: {
                    passengerId: userId,
                    driverId: connectedRide.driverId,
                    connectedRideId: connectedRide.id,
                    comment: reviewDto.reviewContent,
                    rating: reviewDto.rating
                }
            })

            return {success: true};

        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException("Dicka shkoi gabim ne server")
        }
    }
}
