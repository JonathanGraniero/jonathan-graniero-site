/**
 * Idempotent development seed: `npm run db:seed`.
 *
 * - Admin user is upserted from ADMIN_EMAIL / ADMIN_PASSWORD (password rotates on re-seed).
 * - Profile and posts are insert-only, so edits made through /admin survive re-seeding.
 * - Experience, skills and projects are seeded only when their tables are empty.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client.ts';
import { readingTimeMinutes, slugify } from '../src/common/utils/text.ts';
import { seedPosts } from './seed-data/posts.ts';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin user');
    return;
  }
  if (password.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  const passwordHash = await argon2.hash(password);
  await prisma.adminUser.upsert({
    where: { email },
    create: { email, passwordHash },
    update: { passwordHash },
  });
  console.log(`✓ admin user ${email}`);
}

async function seedProfile() {
  await prisma.profile.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Jonathan Graniero',
      headline:
        'Software engineer — backend systems, cloud infrastructure and the occasional frontend.',
      bio: `I'm a software engineer who likes building reliable systems and the tooling around them.

Most of my work sits where application code meets infrastructure: APIs, Kubernetes controllers, autoscaling, auth services and the pipelines that ship them.

*This bio is placeholder copy — edit it from the admin panel.*`,
      location: 'Remote',
      github: 'https://github.com/',
      linkedin: 'https://www.linkedin.com/',
      email: 'hello@example.com',
      resumeUrl: null,
    },
  });
  console.log('✓ profile');
}

async function seedCareer() {
  if ((await prisma.experience.count()) === 0) {
    await prisma.experience.createMany({
      data: [
        {
          company: 'Placeholder Cloud Co.',
          role: 'Senior Software Engineer',
          location: 'Remote',
          startDate: new Date('2024-03-01'),
          endDate: null,
          summary: 'Platform team building internal developer tooling on Kubernetes.',
          highlights: [
            'Designed and shipped custom Kubernetes controllers to automate service onboarding',
            'Introduced queue-based autoscaling, cutting idle compute spend significantly',
            'Mentored engineers on Go, controller-runtime and operational best practices',
          ],
          tech: ['Go', 'Kubernetes', 'AWS', 'Terraform', 'PostgreSQL'],
          sortOrder: 0,
        },
        {
          company: 'Example Data Inc.',
          role: 'Software Engineer',
          location: 'Hybrid',
          startDate: new Date('2021-06-01'),
          endDate: new Date('2024-02-28'),
          summary: 'Backend engineer on the data platform and customer-facing APIs.',
          highlights: [
            'Built a centralised auth service used by every product surface',
            'Owned ETL jobs feeding the company data lake',
            'Led a migration from a monolith to independently deployable services',
          ],
          tech: ['TypeScript', 'Node.js', 'NestJS', 'Python', 'Spark', 'Docker'],
          sortOrder: 1,
        },
        {
          company: 'Startup Studio',
          role: 'Full-stack Developer',
          location: 'On-site',
          startDate: new Date('2019-01-01'),
          endDate: new Date('2021-05-31'),
          summary: 'Early engineer shipping MVPs for multiple product bets.',
          highlights: [
            'Delivered React front ends and REST APIs for four products',
            'Set up CI/CD and infrastructure-as-code from scratch',
          ],
          tech: ['React', 'JavaScript', 'Express', 'MongoDB', 'GitHub Actions'],
          sortOrder: 2,
        },
      ],
    });
    console.log('✓ experience');
  }

  if ((await prisma.skill.count()) === 0) {
    await prisma.skill.createMany({
      data: [
        { name: 'TypeScript', category: 'LANGUAGE', level: 5 },
        { name: 'Go', category: 'LANGUAGE', level: 4 },
        { name: 'Python', category: 'LANGUAGE', level: 4 },
        { name: 'SQL', category: 'LANGUAGE', level: 4 },
        { name: 'React', category: 'FRONTEND', level: 4 },
        { name: 'Tailwind CSS', category: 'FRONTEND', level: 3 },
        { name: 'NestJS', category: 'BACKEND', level: 5 },
        { name: 'Node.js', category: 'BACKEND', level: 5 },
        { name: 'REST & OpenAPI', category: 'BACKEND', level: 5 },
        { name: 'PostgreSQL', category: 'DATA', level: 4 },
        { name: 'Redis', category: 'DATA', level: 3 },
        { name: 'Kubernetes', category: 'INFRA', level: 5 },
        { name: 'AWS', category: 'INFRA', level: 4 },
        { name: 'Terraform', category: 'INFRA', level: 4 },
        { name: 'Docker', category: 'INFRA', level: 5 },
        { name: 'GitHub Actions', category: 'TOOLING', level: 4 },
        { name: 'Prometheus & Grafana', category: 'TOOLING', level: 3 },
      ],
    });
    console.log('✓ skills');
  }

  if ((await prisma.project.count()) === 0) {
    await prisma.project.createMany({
      data: [
        {
          name: 'This site',
          description:
            'Self-hosted blog and portfolio: a React client and NestJS API sharing a typed contract, backed by Postgres full-text search.',
          repoUrl: 'https://github.com/',
          url: null,
          tech: ['React', 'NestJS', 'Prisma', 'PostgreSQL'],
          featured: true,
          sortOrder: 0,
        },
        {
          name: 'Queue-aware autoscaler',
          description:
            'Kubernetes controller that scales workers on queue backlog rather than CPU, including scale-to-zero.',
          repoUrl: 'https://github.com/',
          url: null,
          tech: ['Go', 'Kubernetes', 'KEDA'],
          featured: true,
          sortOrder: 1,
        },
        {
          name: 'Auth service',
          description:
            'Standalone OAuth2/OIDC-style auth service with token rotation and audit logging.',
          repoUrl: 'https://github.com/',
          url: null,
          tech: ['TypeScript', 'NestJS', 'Redis'],
          featured: true,
          sortOrder: 2,
        },
        {
          name: 'Discord bot',
          description:
            'Community bot with slash commands, scheduled jobs and a small plugin system.',
          repoUrl: 'https://github.com/',
          url: null,
          tech: ['TypeScript', 'discord.js'],
          featured: false,
          sortOrder: 3,
        },
      ],
    });
    console.log('✓ projects');
  }
}

async function seedPostsTable() {
  let created = 0;
  for (const p of seedPosts) {
    const exists = await prisma.post.findUnique({ where: { slug: p.slug }, select: { id: true } });
    if (exists) continue;
    await prisma.post.create({
      data: {
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        contentMd: p.contentMd,
        status: p.publishedAt ? 'PUBLISHED' : 'DRAFT',
        publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
        readingTimeMin: readingTimeMinutes(p.contentMd),
        tags: {
          connectOrCreate: p.tags.map((name) => ({
            where: { slug: slugify(name) },
            create: { slug: slugify(name), name },
          })),
        },
      },
    });
    created++;
  }
  console.log(`✓ posts (${created} new, ${seedPosts.length - created} existing)`);
}

async function main() {
  await seedAdmin();
  await seedProfile();
  await seedCareer();
  await seedPostsTable();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
