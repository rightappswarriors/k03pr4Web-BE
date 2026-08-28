import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Database Connection OK ===');

  const total = await prisma.notification.count();
  const withConv = await prisma.notification.count({ where: { conversationId: { not: null } } });
  const nullConv = await prisma.notification.count({ where: { conversationId: null } });
  const withAgent = await prisma.notification.count({ where: { agentId: { not: null } } });
  const nullAgent = await prisma.notification.count({ where: { agentId: null } });

  console.log('Notification counts:', JSON.stringify({ total, withConv, nullConv, withAgent, nullAgent }, null, 2));

  const nullConvByType = await prisma.notification.groupBy({
    by: ['type'],
    where: { conversationId: null },
    _count: true,
  });
  console.log('NULL conversationId by type:', JSON.stringify(nullConvByType, null, 2));

  const nullAgentByType = await prisma.notification.groupBy({
    by: ['type'],
    where: { agentId: null },
    _count: true,
  });
  console.log('NULL agentId by type:', JSON.stringify(nullAgentByType, null, 2));

  const samples = await prisma.notification.findMany({
    where: { conversationId: null },
    take: 10,
    select: { id: true, orgId: true, agentId: true, type: true, title: true, message: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  console.log('Sample NULL-convId notifications:', JSON.stringify(samples, null, 2));

  const samples2 = await prisma.notification.findMany({
    where: { agentId: null, conversationId: { not: null } },
    take: 10,
    select: { id: true, orgId: true, agentId: true, type: true, title: true, message: true, conversationId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  console.log('Sample NULL-agentId notifications with convId:', JSON.stringify(samples2, null, 2));
}

main()
  .catch(e => { console.error('ERROR:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
