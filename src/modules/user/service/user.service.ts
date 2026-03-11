import { EntityManager } from "@mikro-orm/postgresql";
import { BadRequestException, Injectable } from "@nestjs/common";
import { User } from "src/entities/user.entity";

@Injectable()
export class UserService {
    constructor(private readonly em: EntityManager) {}

    async getProfile(userId: number) {
        //1) Get the user based on userId
        const user = await this.em.findOne(User, { id: userId }, {
            populate: [
                'company',
                'company.address',
                'company.shippingPreferences',
                'role',
                'role.permissions'
            ]
        })

        //2) Throw exception for no user data
        if(!user){
            throw new BadRequestException("User doesn't exist, Try logging in again")
        }

        //3) Return user
        return user;
    }
}