import { Collection, Entity, ManyToMany, PrimaryKey, Property } from '@mikro-orm/core'
import { Permission } from './permission.entity';

@Entity()
export class Role {
    @PrimaryKey()
    id!: number;

    @Property({ unique: true})
    name: string;

    @ManyToMany(() => Permission, permission => permission.roles, { owner: true})
    permissions = new Collection<Permission>(this);
}