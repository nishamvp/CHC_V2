import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

console.log('1. Script started');
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('2. Connecting and creating organization...');
  const org = await prisma.organization.create({
    data: { name: 'Al Bataeh Municipality' },
  });
  console.log('3. Organization created:', org.id);

  console.log('4. Hashing password...');
  const hash = await bcrypt.hash('password123', 10);
  console.log('5. Password hashed');

  console.log('6. Creating user...');
  await prisma.user.create({
    data: {
      organizationId: org.id,
      username: 'admin',
      email: 'admin@chc.local',
      passwordHash: hash,
    },
  });

  console.log('7. Seed complete.');
}

main()
  .catch((err) => {
    console.error('SCRIPT FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());