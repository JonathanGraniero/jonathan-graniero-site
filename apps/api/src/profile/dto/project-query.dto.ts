import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class ProjectQueryDto {
  /** Only return featured projects. */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  featured?: boolean;
}
