import { Type } from "class-transformer";
import { IsArray, IsDate, IsNotEmpty, IsNumber, IsString } from "class-validator";


export class CreateReminderDTO {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsString()
    @IsNotEmpty()
    message!: string;

    @Type(() => Date)
    @IsDate()
    scheduledAt!: Date;

    @IsArray()
    @IsNotEmpty()
    sendTo!: number[];
}