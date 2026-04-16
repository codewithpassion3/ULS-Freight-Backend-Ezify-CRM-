import { IsArray, IsInt } from "class-validator";

export class MarkAsReadDTO {
    @IsArray()
    @IsInt({ each: true })
    notificationIds!: number[];
}