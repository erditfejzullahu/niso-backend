import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Roles } from 'common/decorators/roles.decorator';
import { Role, User } from '@prisma/client';
import type { Request } from 'express';
import { CreateReviewDto } from './dto/createReview.dto';
import { PaginationDto } from 'utils/pagination.dto';

@Controller('reviews')
export class ReviewsController {
    constructor(
        private readonly reviewsService: ReviewsService
    ){}

    @Roles(Role.PASSENGER)
    @Post('make-review')
    async makeReviewAgainstDriver(@Req() req: Request, @Body() body: CreateReviewDto) {
        const user = req.user as User;
        return await this.reviewsService.makeReviewAgainstDriver(user.id, body);
    }

    @Roles(Role.DRIVER)
    @Get('get-reviews-driver')
    async getReviewsByDriver(@Req() req: Request){
        const user = req.user as User;
        return await this.reviewsService.getAllReviewsByDriver(user.id);
    }

    @Roles(Role.PASSENGER) //me i shiku pasagjeri rivjus e veta
    @Get('get-reviews-passenger')
    async getReviewsByPassenger(@Req() req: Request, @Query() pagination: PaginationDto) {
        const user = req.user as User;
        return await this.reviewsService.getAllReviewsByPassenger(user.id, pagination);
    }

    @Roles(Role.PASSENGER)
    @Delete('delete-review-passenger/:id')
    async deleteReviewByPassenger(@Req() req: Request, @Param('id') id: string){
        const user = req.user as User;
        return await this.reviewsService.deleteReviewByPassenger(user.id, id)
    }
}
