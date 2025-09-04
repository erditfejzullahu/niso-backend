import { Controller, Get, Req } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Roles } from 'common/decorators/roles.decorator';
import { Role, User } from '@prisma/client';
import type { Request } from 'express';

@Controller('reviews')
export class ReviewsController {
    constructor(
        private readonly reviewsService: ReviewsService
    ){}

    @Roles(Role.DRIVER)
    @Get('get-reviews-driver')
    async getReviewsByDriver(@Req() req: Request){
        const user = req.user as User;
        return await this.reviewsService.getAllReviewsByDriver(user.id);
    }

    @Roles(Role.PASSENGER) //me i shiku pasagjeri rivjus e veta
    @Get('get-reviews-passenger')
    async getReviewsByPassenger(@Req() req: Request) {
        const user = req.user as User;
        return await this.reviewsService.getAllReviewsByPassenger(user.id);
    }
}
