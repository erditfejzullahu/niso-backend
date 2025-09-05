import { Controller, Get, Query, Req } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { Roles } from 'common/decorators/roles.decorator';
import type { Request } from 'express';
import { PassengersService } from './passengers.service';
import { GetAllDriversDtoFilters } from './dto/getAllDrivers.dto';

@Controller('passengers')
export class PassengersController {
    constructor(
        private readonly passengerService: PassengersService
    ){}

    @Roles(Role.PASSENGER)
    @Get('passenger-home-data')
    async getPassengerHomeData(@Req() req: Request){
        const user = req.user as User;
        return await this.passengerService.getPassengerHomeData(user.id);
    }

    @Roles(Role.PASSENGER)
    @Get('passenger-get-drivers')
    async getAllDrivers(@Req() req: Request, @Query() filters: GetAllDriversDtoFilters){
        const user = req.user as User;
        return await this.passengerService.getAllDrivers(user.id, filters)
    }
}
