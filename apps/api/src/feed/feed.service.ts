import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.ts';
import { PrismaService } from '../prisma/prisma.service.ts';

const escapeXml = (s: string) =>
  s.replace(
    /[<>&'"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!,
  );

/** Public, crawlable pages of the web app. */
const STATIC_PATHS = ['/', '/blog', '/about', '/projects', '/contact'];

@Injectable()
export class FeedService {
  private readonly siteUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.siteUrl = config.get('SITE_URL', { infer: true }).replace(/\/$/, '');
  }

  async rss(): Promise<string> {
    const [profile, posts] = await Promise.all([
      this.prisma.profile.findUnique({ where: { id: 1 }, select: { name: true, headline: true } }),
      this.prisma.post.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        take: 20,
        include: { tags: true },
      }),
    ]);
    const title = profile ? `${profile.name} — Blog` : 'Blog';

    const items = posts
      .map((p) => {
        const link = `${this.siteUrl}/blog/${p.slug}`;
        const categories = p.tags.map((t) => `<category>${escapeXml(t.name)}</category>`).join('');
        return `<item><title>${escapeXml(p.title)}</title><link>${link}</link><guid isPermaLink="true">${link}</guid><pubDate>${p.publishedAt!.toUTCString()}</pubDate><description>${escapeXml(p.excerpt)}</description>${categories}</item>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escapeXml(title)}</title>
<link>${this.siteUrl}/blog</link>
<description>${escapeXml(profile?.headline ?? '')}</description>
<language>en</language>
<atom:link href="${this.siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
</channel>
</rss>`;
  }

  async sitemap(): Promise<string> {
    const posts = await this.prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
    });
    const urls = [
      ...STATIC_PATHS.map((path) => `<url><loc>${this.siteUrl}${path}</loc></url>`),
      ...posts.map(
        (p) =>
          `<url><loc>${this.siteUrl}/blog/${p.slug}</loc><lastmod>${p.updatedAt.toISOString()}</lastmod></url>`,
      ),
    ];
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
  }
}
