import { Transform } from "class-transformer";
import { IsOptional, IsArray, IsInt, IsBoolean } from "class-validator";

export class DismissNotificationQueryDTO {
    @IsOptional()
    @Transform(({ value }) => {
        if (!value) return undefined;
       
        return value.toString().split(',').map((id: string) => parseInt(id.trim(), 10));
    })
    @IsArray()
    @IsInt({ each: true })
    notificationIds?: number[];

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true' || value === true)
    dismissAll?: boolean;
}