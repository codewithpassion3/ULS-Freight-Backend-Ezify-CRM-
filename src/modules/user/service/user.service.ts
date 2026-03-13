import { EntityManager, wrap } from "@mikro-orm/postgresql";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { User } from "src/entities/user.entity";
import { CreateProfileDTO } from "../dto/create-profile";
import { Role } from "src/decorators/role.decorator";
import { Permission } from "src/entities/permission.entity";
import { Company } from "src/entities/company.entity";
import bcrypt from "bcrypt";
import { UpdateProfileDTO } from "../dto/update-profile";
import { join } from "path";
import * as fs from "fs/promises";

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
                'permissions'
            ]
        })

        //2) Throw exception for no user data
        if(!user){
            throw new BadRequestException("User doesn't exist, Try logging in again")
        }

        //3) Return user
        return user;
    }

    async createProfile(dto: CreateProfileDTO, companyId: number) {
        return this.em.transactional(async (em) => {

            const { roleId, permissionIds, ...userData } = dto;

            //1) Validate role
            const role = await em.findOne(Role, { id: roleId });
            
            if (!role) {
                throw new BadRequestException("Invalid role");
            }

            //2) Validate permissions
            let permissions: Permission[] = [];

            if(role.name !== 'admin' && permissionIds?.length) {
                const uniquePermissionIds = [...new Set(permissionIds)];
                
                const count = await em.count(Permission, {
                    id: { $in: uniquePermissionIds }
                });
                
                if (count !== uniquePermissionIds.length) {
                    throw new BadRequestException("Invalid permissions provided");
                }

                permissions = uniquePermissionIds.map(id =>
                    em.getReference(Permission, id)
                );
            }

            //3) Hash password
            const passwordHash = await bcrypt.hash(userData.password,10);
            
            //4) Create user
            const user = em.create(User, {
                ...userData,
                password: passwordHash,
                role,
                company: em.getReference(Company, companyId),
                termsAndConditionAccepted: true,
                companyPolicyAccepted: true,
                freightBroker: false,
                emailIsVerified: false
            });

            //5) Assign permissions
            if (permissions.length) {
                user.permissions.set(permissions);
            }

            //6) Persist user
            await em.persist(user).flush();

            //7) Return user
            return;
        });
    }

    async update( userId: number, dto: UpdateProfileDTO, file?: Express.Multer.File ) {
        //1) Get the user
        const user = await this.em.findOneOrFail(User, { id: userId });

        //2) Throw not found exception for missing user
        if (!user) {
            throw new NotFoundException("User not found");
        }

        //3) Copy filtered dto into entity
        wrap(user).assign(dto, { ignoreUndefined: true });

        //4) Check for uploaded image
        if (file) {
            //5) Remove old(alreday existed) image
            if (user.profilePic) {
                const oldPath = join(process.cwd(), user.profilePic);

                fs.unlink(oldPath).catch(() => {});
            }
        
            //6) Update new image path in user
            const fileUrl = `/uploads/profile-pics/${file.filename}`;

            user.profilePic = fileUrl;
        }

        //7) Save user
        await this.em.flush();

        //8) Return updated user
        return user;
    }
}