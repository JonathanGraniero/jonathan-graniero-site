import { Module } from '@nestjs/common';
import { AdminProfileController, ProfileController } from './profile.controller.ts';
import { ProfileService } from './profile.service.ts';

@Module({
  controllers: [ProfileController, AdminProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
