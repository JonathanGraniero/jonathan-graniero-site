import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Experience, Profile, Project, Skill } from '@site/shared';
import { AdminOnly } from '../auth/admin.decorator.ts';
import { CacheControl, CachePolicy } from '../common/decorators/cache-control.decorator.ts';
import { ProjectQueryDto } from './dto/project-query.dto.ts';
import { UpdateProfileDto } from './dto/update-profile.dto.ts';
import { ProfileService } from './profile.service.ts';

@ApiTags('profile')
@Controller()
@CacheControl(CachePolicy.PublicShort)
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get('profile')
  getProfile(): Promise<Profile> {
    return this.profile.getProfile();
  }

  /** Career history, most recent first. */
  @Get('experience')
  listExperience(): Promise<Experience[]> {
    return this.profile.listExperience();
  }

  @Get('skills')
  listSkills(): Promise<Skill[]> {
    return this.profile.listSkills();
  }

  @Get('projects')
  listProjects(@Query() query: ProjectQueryDto): Promise<Project[]> {
    return this.profile.listProjects(query.featured);
  }
}

@ApiTags('admin')
@Controller('admin/profile')
@AdminOnly()
export class AdminProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Patch()
  update(@Body() dto: UpdateProfileDto): Promise<Profile> {
    return this.profile.updateProfile(dto);
  }
}
