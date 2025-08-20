import { PartialType } from "@nestjs/swagger";
import { AddFixedTarifDto } from "./addFixedTarifs.dto";

export class UpdateFixedTarifDto extends PartialType(AddFixedTarifDto){}