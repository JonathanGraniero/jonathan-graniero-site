import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { PrismaService } from '../prisma/prisma.service.ts';
import { AuthService } from './auth.service.ts';

describe('AuthService', () => {
  const jwt = new JwtService({ secret: 'x'.repeat(32), signOptions: { expiresIn: 60 } });
  let findUnique: jest.Mock;
  let service: AuthService;

  beforeAll(async () => {
    const passwordHash = await argon2.hash('correct-horse');
    findUnique = jest.fn(({ where }: { where: { email: string } }) =>
      Promise.resolve(
        where.email === 'me@example.com'
          ? { id: 'u1', email: 'me@example.com', passwordHash }
          : null,
      ),
    );
    service = new AuthService({ adminUser: { findUnique } } as unknown as PrismaService, jwt);
  });

  it('accepts valid credentials case-insensitively on email', async () => {
    await expect(service.validateCredentials('Me@Example.com', 'correct-horse')).resolves.toEqual({
      id: 'u1',
      email: 'me@example.com',
    });
  });

  it('rejects a wrong password', async () => {
    await expect(service.validateCredentials('me@example.com', 'nope-nope')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects unknown users with the same error', async () => {
    await expect(service.validateCredentials('who@example.com', 'correct-horse')).rejects.toThrow(
      'Invalid email or password',
    );
  });

  it('round-trips a signed token', async () => {
    const token = await service.signToken({ id: 'u1', email: 'me@example.com' });
    await expect(service.verifyToken(token)).resolves.toEqual({
      id: 'u1',
      email: 'me@example.com',
    });
  });

  it('rejects tampered tokens', async () => {
    const token = await service.signToken({ id: 'u1', email: 'me@example.com' });
    await expect(service.verifyToken(token.slice(0, -2) + 'xx')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
