import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";

console.log("1. Script started");
console.log("DATABASE_URL:", process.env.DATABASE_URL);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("2. Connecting and creating organization...");
  const org = await prisma.organization.create({
    data: { name: "Al Bataeh Municipality" },
  });
  console.log("3. Organization created:", org.id);

  console.log("4. Hashing password...");
  const hash = await bcrypt.hash("password123", 10);
  console.log("5. Password hashed");

  console.log("6. Creating user...");
  const user = await prisma.user.create({
    data: {
      organizationId: org.id,
      username: "admin",
      email: "admin@chc.local",
      passwordHash: hash,
    },
  });
  console.log("7. User created:", user.id);

  console.log("8. Creating permission catalog...");
  const permissionCodes = [
    "department.manage",
    "department.membership.manage",
    "user.manage",
    "role.manage",
  ];
  const permissions = await Promise.all(
    permissionCodes.map((code) => prisma.permission.create({ data: { code } })),
  );
  console.log("9. Permissions created:", permissions.length);

  console.log("10. Creating Superadmin role...");
  const superadminRole = await prisma.role.create({
    data: {
      organizationId: org.id,
      name: "Superadmin",
      description: "Full system access",
    },
  });
  console.log("11. Role created:", superadminRole.id);

  console.log("12. Attaching all permissions to Superadmin role...");
  await Promise.all(
    permissions.map((p) =>
      prisma.rolePermission.create({
        data: { roleId: superadminRole.id, permissionId: p.id },
      }),
    ),
  );

  console.log("13. Assigning Superadmin role to admin user...");
  await prisma.userRole.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      roleId: superadminRole.id,
      scope: "GLOBAL",
    },
  });

  console.log("14. RBAC seed complete.");
}

main()
  .catch((err) => {
    console.error("SCRIPT FAILED:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());