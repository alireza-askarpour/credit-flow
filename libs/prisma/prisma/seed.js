const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const users = [
    {
      name: 'Sample User',
      email: 'sample.user@credit-flow.local',
      balance: 1000000n,
    },
    {
      name: 'Low Balance User',
      email: 'low.balance@credit-flow.local',
      balance: 10000n,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name },
      create: user,
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
