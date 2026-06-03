# Prisma Setup

Prisma is installed and wired into NestJS, but the live PostgreSQL database is
not accessible from this machine yet. The current `schema.prisma` is a safe
placeholder so the app can build.

When you receive database access:

```bash
npm install
```

Set this in `.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

Then introspect the existing database:

```bash
npm run prisma:pull
npm run prisma:generate
```

After that, services can gradually move from raw SQL to `PrismaService`.
Do this one module at a time so existing frontend API behavior stays stable.
