import { Type } from "class-transformer";
import { IsDate, IsNotEmpty, IsNumber, IsString } from "class-validator";


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

    @IsNumber()
    @IsNotEmpty()
    sendTo!: number;
}