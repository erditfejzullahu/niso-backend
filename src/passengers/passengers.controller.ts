import { Controller, Get, Req } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { Roles } from 'common/decorators/roles.decorator';
import type { Request } from 'express';
import { PassengersService } from './passengers.service';

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
}
