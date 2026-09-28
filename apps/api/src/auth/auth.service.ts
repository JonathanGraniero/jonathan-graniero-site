import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { AuthUser } from '@site/shared';
import { PrismaService } from '../prisma/prisma.service.ts';
import type { JwtPayload } from './auth.constants.ts';

@Injectable()
export class AuthService {
  /**
   * Verified against when the email is unknown so both paths cost the same,
   * which prevents account enumeration via response timing.
   */
  private readonly dummyHash = argon2.hash('timing-equaliser-not-a-real-password');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async validateCredentials(email: string, password: string): Promise<AuthUser> {
    const user = await this.prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
    const hash = user?.passwordHash ?? (await this.dummyHash);
    const valid = await argon2.verify(hash, password);
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return { id: user.id, email: user.email };
  }

  signToken(user: AuthUser): Promise<string> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return this.jwt.signAsync(payload);
  }

  async verifyToken(token: string): Promise<AuthUser> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      return { id: payload.sub, email: payload.email };
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
