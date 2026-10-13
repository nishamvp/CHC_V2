import { Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';
import { PrismaService } from '../database/prisma.service';

type Actions =
  'manage' | 'create' | 'read' | 'update' | 'delete' | 'reopen' | 'assign';

type Subjects =
  'Department' | 'DepartmentMembership' | 'Role' | 'User' | 'Request' | 'all';

export type AppAbility = MongoAbility<[Actions, Subjects]>;

// "department.membership" -> "DepartmentMembership", "special_request" -> "SpecialRequest"
const toSubject = (parts: string[]) =>
  parts
    .flatMap((part) => part.split('_'))
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('') as Subjects;

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
        const parts = rp.permission.code.split('.');
        if (parts.length < 2) continue; // ignore malformed codes

        const action = parts.pop() as Actions; // last piece = action
        const subjectName = toSubject(parts); // everything before it = subject

        if (ur.scope === 'GLOBAL') {
          can(action, subjectName);
        } else if (ur.scope === 'DEPARTMENT' && ur.departmentId) {
          can(action, subjectName, { id: ur.departmentId } as any);
        }
      }
    }

    return build();
  }
}
