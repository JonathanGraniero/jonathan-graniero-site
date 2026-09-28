import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.ts';
import { AllExceptionsFilter, uniqueViolationField } from './all-exceptions.filter.ts';

function mockHost() {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const host = {
    switchToHttp: () => ({ getRequest: () => ({ originalUrl: '/api/x' }), getResponse: () => res }),
  } as unknown as ArgumentsHost;
  return { host, res };
}

function prismaError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('boom', { code, clientVersion: 'test', meta });
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('passes HttpException status and validation messages through', () => {
    const { host, res } = mockHost();
    filter.catch(new BadRequestException(['title must be a string']), host);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: 'Bad Request',
        message: ['title must be a string'],
        path: '/api/x',
      }),
    );
  });

  it('maps Prisma P2002 to 409 with the offending field', () => {
    const { host, res } = mockHost();
    filter.catch(
      prismaError('P2002', {
        driverAdapterError: { cause: { constraint: { index: 'Post_slug_key' } } },
      }),
      host,
    );
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'A record with this slug already exists' }),
    );
  });

  it('maps Prisma P2025 to 404', () => {
    const { host, res } = mockHost();
    filter.catch(prismaError('P2025'), host);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('hides internals of unknown errors behind a 500', () => {
    const { host, res } = mockHost();
    jest.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
    filter.catch(new Error('db password is hunter2'), host);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
    );
  });

  it('keeps NotFoundException messages', () => {
    const { host, res } = mockHost();
    filter.catch(new NotFoundException('Post "x" not found'), host);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Post "x" not found' }),
    );
  });
});

describe('uniqueViolationField', () => {
  it('prefers explicit target fields', () => {
    expect(uniqueViolationField({ target: ['email'] })).toBe('email');
  });
  it('parses compound index names', () => {
    expect(
      uniqueViolationField({
        driverAdapterError: { cause: { constraint: { index: 'Tag_slug_name_key' } } },
      }),
    ).toBe('slug, name');
  });
  it('returns undefined when nothing is known', () => {
    expect(uniqueViolationField(undefined)).toBeUndefined();
  });
});
