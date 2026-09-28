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
import { Prisma, PrismaClient } from '../src/generated/prisma/client.ts';
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
        'Software engineer building Kubernetes operators, AWS infrastructure and the backend services around them.',
      bio: `I'm a software engineer who works where application code meets infrastructure: Kubernetes controllers, AWS, and the backend services that tie them together.

Lately that means building [kflare](/blog/building-kflare-kubernetes-operator-for-cloudflare), a Kubernetes operator for Cloudflare, and contributing to [AWS Controllers for Kubernetes](/blog/adding-a-database-resource-to-the-ack-glue-controller) (ACK), where I'm adding Data Catalog support to the Glue controller.

I write mostly Go and Python, and TypeScript when there's an API or UI to build. This site is where I write up what I learn along the way.`,
      location: 'Remote',
      github: 'https://github.com/JonathanGraniero',
      linkedin: 'https://www.linkedin.com/in/jonathangraniero/',
      email: null,
      resumeUrl: null,
    },
  });
  console.log('✓ profile');
}

/**
 * Work history is intentionally empty until real entries are provided; the
 * About page hides the section when there are none.
 */
const experience: Prisma.ExperienceCreateManyInput[] = [];

/** Grouped on the About page. `level` is stored but not displayed. */
const skills: Prisma.SkillCreateManyInput[] = [
  { name: 'Go', category: 'LANGUAGE', level: 3 },
  { name: 'Python', category: 'LANGUAGE', level: 3 },
  { name: 'TypeScript', category: 'LANGUAGE', level: 3 },
  { name: 'SQL', category: 'LANGUAGE', level: 3 },
  { name: 'React', category: 'FRONTEND', level: 3 },
  { name: 'NestJS', category: 'BACKEND', level: 3 },
  { name: 'FastAPI', category: 'BACKEND', level: 3 },
  { name: 'Node.js', category: 'BACKEND', level: 3 },
  { name: 'PostgreSQL', category: 'DATA', level: 3 },
  { name: 'AWS Glue', category: 'DATA', level: 3 },
  { name: 'Kubernetes', category: 'INFRA', level: 3 },
  { name: 'controller-runtime & kubebuilder', category: 'INFRA', level: 3 },
  { name: 'AWS', category: 'INFRA', level: 3 },
  { name: 'Terraform', category: 'INFRA', level: 3 },
  { name: 'Pulumi', category: 'INFRA', level: 3 },
  { name: 'Docker', category: 'INFRA', level: 3 },
  { name: 'Helm', category: 'TOOLING', level: 3 },
  { name: 'kind', category: 'TOOLING', level: 3 },
  { name: 'GitHub Actions', category: 'TOOLING', level: 3 },
];

const projects: Prisma.ProjectCreateManyInput[] = [
  {
    name: 'kflare',
    description:
      'Kubernetes operator for Cloudflare: manage accounts, zones and DNS records as custom resources, with adoption of existing records, drift detection and GitOps-friendly workflows.',
    repoUrl: 'https://github.com/JonathanGraniero/kflare',
    url: null,
    tech: ['Go', 'Kubernetes', 'controller-runtime', 'Cloudflare API'],
    featured: true,
    sortOrder: 0,
  },
  {
    name: 'ACK Glue controller: Database resource',
    description:
      'Open-source contribution to AWS Controllers for Kubernetes, adding a Glue Data Catalog Database resource with tag syncing and e2e tests.',
    url: 'https://github.com/aws-controllers-k8s/glue-controller/pull/16',
    repoUrl: 'https://github.com/JonathanGraniero/glue-controller',
    tech: ['Go', 'Kubernetes', 'AWS Glue', 'ACK'],
    featured: true,
    sortOrder: 1,
  },
  {
    name: 'This site',
    description:
      'Self-hosted blog and portfolio: a React client and NestJS API sharing a typed contract, with Postgres full-text search and a markdown admin editor.',
    url: null,
    repoUrl: null,
    tech: ['React', 'NestJS', 'Prisma', 'PostgreSQL'],
    featured: true,
    sortOrder: 2,
  },
  {
    name: 'SageMaker LLM deployment',
    description:
      'Pulumi program in Python that deploys a Hugging Face language model to an Amazon SageMaker endpoint, with IAM roles and CloudWatch alarms.',
    url: null,
    repoUrl: 'https://github.com/jgraniero52/ai-playground',
    tech: ['Python', 'Pulumi', 'AWS SageMaker', 'Hugging Face'],
    featured: false,
    sortOrder: 3,
  },
  {
    name: 'find-book',
    description:
      'Go command-line tool that searches for books and series by title or ISBN, and generates purchase links for major retailers.',
    url: null,
    repoUrl: 'https://github.com/jgraniero52/find-book',
    tech: ['Go', 'CLI', 'REST APIs'],
    featured: false,
    sortOrder: 4,
  },
  {
    name: 'Krugerrand Discord bot',
    description:
      'Discord bot with slash commands for live gold and Krugerrand prices, runnable as a long-lived bot or as an AWS Lambda webhook handler.',
    url: null,
    repoUrl: null,
    tech: ['Python', 'Discord API', 'AWS Lambda'],
    featured: false,
    sortOrder: 5,
  },
];

async function seedCareer() {
  if (experience.length && (await prisma.experience.count()) === 0) {
    await prisma.experience.createMany({ data: experience });
    console.log('✓ experience');
  }
  if ((await prisma.skill.count()) === 0) {
    await prisma.skill.createMany({ data: skills });
    console.log('✓ skills');
  }
  if ((await prisma.project.count()) === 0) {
    await prisma.project.createMany({ data: projects });
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
