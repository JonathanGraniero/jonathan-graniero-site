import { Injectable, NotFoundException } from '@nestjs/common';
import type { Experience, Profile, Project, Skill } from '@site/shared';
import type { Profile as ProfileRow } from '../generated/prisma/client.ts';
import { PrismaService } from '../prisma/prisma.service.ts';
import type { UpdateProfileDto } from './dto/update-profile.dto.ts';

const PROFILE_ID = 1;

function toProfile(row: ProfileRow): Profile {
  const social = Object.fromEntries(
    (['github', 'linkedin', 'email', 'website'] as const)
      .filter((k) => row[k])
      .map((k) => [k, row[k] as string]),
  );
  return {
    name: row.name,
    headline: row.headline,
    bio: row.bio,
    location: row.location,
    avatarUrl: row.avatarUrl,
    resumeUrl: row.resumeUrl,
    social,
  };
}

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(): Promise<Profile> {
    const row = await this.prisma.profile.findUnique({ where: { id: PROFILE_ID } });
    if (!row) throw new NotFoundException('Profile has not been set up yet');
    return toProfile(row);
  }

  async updateProfile(dto: UpdateProfileDto): Promise<Profile> {
    const { social, ...fields } = dto;
    const row = await this.prisma.profile.update({
      where: { id: PROFILE_ID },
      data: { ...fields, ...social },
    });
    return toProfile(row);
  }

  async listExperience(): Promise<Experience[]> {
    const rows = await this.prisma.experience.findMany({
      orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }],
    });
    return rows.map(({ sortOrder: _sortOrder, ...r }) => ({
      ...r,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate?.toISOString() ?? null,
    }));
  }

  listSkills(): Promise<Skill[]> {
    return this.prisma.skill.findMany({
      orderBy: [{ category: 'asc' }, { level: 'desc' }, { name: 'asc' }],
    });
  }

  async listProjects(featured?: boolean): Promise<Project[]> {
    const rows = await this.prisma.project.findMany({
      where: featured ? { featured: true } : undefined,
      orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
    });
    return rows.map(({ sortOrder: _sortOrder, ...r }) => r);
  }
}
