import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { FinancesService } from './finances.service';
import { Roles } from 'common/decorators/roles.decorator';
import { Role, User } from '@prisma/client';
import type { Request } from 'express';
import { FinancialMirrorDataDto } from './dto/getFinancialData.dto';

@Controller('finances')
export class FinancesController {
    constructor(
        private readonly financesService: FinancesService
    ){}

    @Roles(Role.DRIVER)
    @Get('driver-finances')
    async getDriverFinances(@Req() request: Request){
        const user = request.user as User;
        return await this.financesService.getDriverFinances(user.id);
    }

    @Roles(Role.PASSENGER)
    @Get('passenger-finances')
    async getPassangerFinances(@Req() req: Request){
        const user = req.user as User;
        return await this.financesService.getPassengerFinances(user.id);
    }

    @Roles(Role.DRIVER)
    @Get('all-driver-finances')
    async getAllDriverFinancesList(@Req() req: Request){
        const user = req.user as User;
        return await this.financesService.getAllDriverEarningList(user.id);
    }

    @Roles(Role.PASSENGER)
    @Get('all-passenger-finances')
    async getAllPassengerFinancesList(@Req() req: Request){
        const user = req.user as User;
        return await this.financesService.getAllPassengerExpensesList(user.id);
    }

    @Roles(Role.PASSENGER, Role.DRIVER)
    @Get('financial-mirror')
    async getFinancialMirrorData(@Req() req: Request, @Query() query: FinancialMirrorDataDto) {
        const user = req.user as User;
        return await this.financesService.getFinancialMirrorData(user, query);
    }

    @Roles(Role.DRIVER, Role.PASSENGER)
    @Get('get-fin-detail/:id')
    async getSpecificFinancialDetail(@Req() req: Request, @Param('id') id: string){
        const user = req.user as User;
        return await this.financesService.getSpecificFinancialDetail(user, id);
    }
}
