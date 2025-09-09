import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { Roles } from 'common/decorators/roles.decorator';
import type { Request } from 'express';
import { PassengersService } from './passengers.service';
import { GetAllDriversDtoFilters } from './dto/getAllDrivers.dto';
import { AddPreferredDriverDto } from './dto/addPreferredDriver.dto';

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


    //prefered section
    @Roles(Role.PASSENGER)
    @Get('preferred-drivers')
    async getPreferredDrivers(@Req() req: Request){
        const user = req.user as User;
        return await this.passengerService.getPreferredDrivers(user.id);
    }

    @Roles(Role.PASSENGER)
    @Get('drivers-driven-with')
    async getDriversDrivenWith(@Req() req: Request){
        const user = req.user as User;
        return await this.passengerService.getDriversDrivenWith(user.id);
    }

    @Roles(Role.PASSENGER)
    @Post('preferred-driver')
    async addPreferredDriverByPassenger(@Req() req: Request, @Body() body: AddPreferredDriverDto){
        const user = req.user as User;
        return await this.passengerService.addPreferredDriverByPassenger(user.id, body);
    }

    //refered section
}
