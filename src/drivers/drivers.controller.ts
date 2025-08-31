import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { Roles } from 'common/decorators/roles.decorator';
import { Role, User } from '@prisma/client';
import type { Request } from 'express';
import { AddFixedTarifDto } from './dto/addFixedTarifs.dto';
import { UpdateFixedTarifDto } from './dto/updateFixedTarifs.dto';

@Controller('drivers')
export class DriversController {
    constructor(
        private readonly driverService: DriversService
    ){}

    @Roles(Role.DRIVER)
    @Get('all-tarifs')
    async getTarifs(@Req() req: Request, @Query('searchParam') searchParam?: string | null){
        const user = req.user as User;
        return await this.driverService.getFixedTarifs(user.id, searchParam);
    }

    @Roles(Role.DRIVER)
    @Post('add-tarif')
    async addTarif(@Req() req: Request, @Body() body: AddFixedTarifDto){
        const user = req.user as User;
        return await this.driverService.addFixedTarif(user.id, body);
    }

    @Roles(Role.DRIVER)
    @Get('available-rides')
    async getAvailableRides(@Req() req: Request){
        const user = req.user as User;
        return await this.driverService.getAvailableRides();
    }

    @Roles(Role.DRIVER)
    @Get('regular-clients')
    async getRegularClients(@Req() req: Request, @Query('searchParam') searchParam?: string | null){
        const user = req.user as User;
        return await this.driverService.getRegularClients(user.id, searchParam);
    }

    @Roles(Role.DRIVER)
    @Patch('update-tarif/:id')
    async updateTarif(@Req() req: Request, @Body() body: UpdateFixedTarifDto, @Param('id') tarifId: string){
        const user = req.user as User;
        return await this.driverService.updateFixedTarif(user.id, tarifId, body);
    }

    @Roles(Role.DRIVER)
    @Delete('delete-tarif/:id')
    async deleteTarif(@Req() req: Request, @Param('id') tarifId: string){
        const user = req.user as User;
        return await this.driverService.deleteFixedTarif(user.id, tarifId);
    }
}
