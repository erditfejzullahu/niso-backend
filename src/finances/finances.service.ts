import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FinancesService {
    constructor(
        private readonly prisma: PrismaService
    ){}

    async getDriverFinances(userId: string) {
        
    }

    async getPassengerFinances(userId: string){

    }

    async getAllDriverEarningList(userId: string){

    }

    async getAllPassengerExpensesList(userId: string){

    }

    async getSpecificFinancialDetail(userId: string, finId: string){
        
    }
}
