const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const drafts = await prisma.post.findMany({
    where: { status: 'draft' },
    select: { id: true, title: true, slug: true, status: true, createdAt: true, content: true },
  });
  
  console.log('Draft Posts:');
  console.log(JSON.stringify(drafts, null, 2));
  
  process.exit(0);
}

main().catch(console.error);
