import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";
import { APP_PERMISSIONS } from "@repo/shared";

console.log("1. Script started");
console.log("DATABASE_URL:", process.env.DATABASE_URL);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("2. Upserting default organization...");
  // Organization name isn't unique, so we find first, or create.
  let org = await prisma.organization.findFirst({
    where: { name: "Al Bataeh Municipality" },
  });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: "Al Bataeh Municipality" },
    });
  }
  console.log("3. Organization ready:", org.id);

  console.log("4. Hashing password...");
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "password123";
  const hash = await bcrypt.hash(adminPassword, 10);
  console.log("5. Password hashed");

  console.log("6. Upserting user...");
  const user = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      passwordHash: hash, // update password in case it changed in env
    },
    create: {
      organizationId: org.id,
      username: "admin",
      email: "admin@chc.local",
      passwordHash: hash,
    },
  });
  console.log("7. User ready:", user.id);

  console.log("8. Upserting permission catalog...");
  const permissionCodes = Object.values(APP_PERMISSIONS);
  const permissions = await Promise.all(
    permissionCodes.map((code) =>
      prisma.permission.upsert({
        where: { code },
        update: {}, // no updates to permission itself
        create: { code },
      })
    )
  );
  console.log("9. Permissions ready:", permissions.length);

  console.log("10. Upserting Superadmin role...");
  const superadminRole = await prisma.role.upsert({
    where: {
      organizationId_name: {
        organizationId: org.id,
        name: "Superadmin",
      },
    },
    update: { description: "Full system access" },
    create: {
      organizationId: org.id,
      name: "Superadmin",
      description: "Full system access",
    },
  });
  console.log("11. Role ready:", superadminRole.id);

  console.log("12. Attaching all permissions to Superadmin role...");
  // Upsert for role permissions
  await Promise.all(
    permissions.map((p) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superadminRole.id,
            permissionId: p.id,
          },
        },
        update: {}, // do nothing if exists
        create: {
          roleId: superadminRole.id,
          permissionId: p.id,
        },
      })
    )
  );

  console.log("13. Assigning Superadmin role to admin user...");
  // UserRole doesn't have a compound unique constraint on userId+roleId by default,
  // so we find first, or create.
  let userRole = await prisma.userRole.findFirst({
    where: { userId: user.id, roleId: superadminRole.id },
  });
  if (!userRole) {
    userRole = await prisma.userRole.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        roleId: superadminRole.id,
        scope: "GLOBAL",
      },
    });
  }

  console.log("14. RBAC seed complete.");
}

main()
  .catch((err) => {
    console.error("SCRIPT FAILED:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());