import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { Roles } from 'common/decorators/roles.decorator';
import type { Request } from 'express';
import { CreateNewRideRequestDto } from './dto/createRide.dto';
import { RideService } from './rides.service';
import { ConnectRideRequestDto } from './dto/connectRideRequest.dto';
import { SendPriceOfferDto } from './dto/sendPriceOffer.dto';
import { FinishRideManuallyByDriverDto } from './dto/finishRideManuallyByDriver.dto';

@Controller('rides')
export class RideController {
    constructor(
        private readonly rideService: RideService
    ){}

    @Roles(Role.PASSENGER)
    @Get('passenger-home-data')
    async getPassengerHomeData(@Req() req: Request){
        const user = req.user as User;
        return await this.rideService.getPassengerHomeData(user.id);
    }

    @Roles(Role.PASSENGER)
    @Post('passenger-create-riderequest')
    async createNewRideRequestByPassenger(@Req() req: Request, @Body() body: CreateNewRideRequestDto){
        const user = req.user as User;
        return await this.rideService.createNewRideRequestByPassenger(user.id, body);
    }

    @Roles(Role.PASSENGER)
    @Post('connect-riderequest-passenger')
    async connectRideRequestByPassenger(@Req() req: Request, @Body() body: ConnectRideRequestDto){
        const user = req.user as User;
        if(user.id !== body.passengerId) throw new ForbiddenException("Ju nuk jeni te lejuar per kete veprim.");
        return await this.rideService.connectRideRequestByPassenger(body);
    }

    @Roles(Role.DRIVER)
    @Post('connect-riderequest-driver')
    async connectRideRequestByDriver(@Req() req: Request, @Body() body: ConnectRideRequestDto){
        const user = req.user as User;
        if(user.id !== body.driverId) throw new ForbiddenException("Ju nuk jeni te lejuar per kete veprim.");
        return await this.rideService.connectRideRequestByDriver(body);
    }

    @Roles(Role.PASSENGER)
    @Post('send-negotiate-price-passenger')
    async sendPriceOfferFromPassengerToDriver(@Req() req: Request, @Body() body: SendPriceOfferDto){
        const user = req.user as User;
        if(user.id !== body.passengerId) throw new ForbiddenException("Ju nuk jeni te lejuar per kete veprim.");
        return await this.rideService.sendPriceOfferFromPassengerToDriver(body);
    }

    @Roles(Role.DRIVER)
    @Post('send-negotiate-price-driver')
    async sendPriceOfferFromDriverToPassenger(@Req() req: Request, @Body() body: SendPriceOfferDto){
        const user = req.user as User;
        if(user.id !== body.driverId) throw new ForbiddenException("Ju nuk jeni te lejuar per kete veprim.");
        return await this.rideService.sendPriceOfferFromDriverToPassenger(body);
    }

    @Roles(Role.DRIVER)
    @Patch('complete-ride-manually-driver')
    async completeRideManuallyByDriver(@Req() req: Request, @Body() rideDto: FinishRideManuallyByDriverDto){
        const user = req.user as User;
        return await this.rideService.completeRideManuallyByDriver(user.id, rideDto)
    }

    @Roles(Role.PASSENGER)
    @Patch('cancel-ride-manually-passenger/:id')
    async completeRideManuallyByPassenger(@Req() req: Request, @Param('id') connectedRideId: string){
        const user = req.user as User;
        return await this.rideService.cancelRideManuallyByPassenger(user.id, connectedRideId);
    }

    @Roles(Role.DRIVER)
    @Patch('start-ride-manually-driver/:id')
    async startRideManuallyByDriver(@Req() req: Request, @Param('id') connectedRideId: string){
        const user = req.user as User;
        return await this.rideService.cancelRideManuallyByPassenger(user.id, connectedRideId)
    }

}
