import { Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';
import { PrismaService } from '../database/prisma.service';

type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete';
type Subjects = 'Department' | 'Role' | 'User' | 'all';
export type AppAbility = MongoAbility<[Actions, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  constructor(private prisma: PrismaService) {}

  async createForUser(userId: string): Promise<AppAbility> {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
      },
    });

    for (const ur of userRoles) {
      for (const rp of ur.role.rolePermissions) {
        const [subject, action] = rp.permission.code.split('.');
        const subjectName = (subject.charAt(0).toUpperCase() +
          subject.slice(1)) as Subjects;

        if (ur.scope === 'GLOBAL') {
          can(action as Actions, subjectName);
        } else if (ur.scope === 'DEPARTMENT' && ur.departmentId) {
          can(action as Actions, subjectName, { id: ur.departmentId } as any);
        }
      }
    }

    return build();
  }
}
