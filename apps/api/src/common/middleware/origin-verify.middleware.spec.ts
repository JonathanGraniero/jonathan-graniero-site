import type { NextFunction, Request, Response } from 'express';
import { originVerify } from './origin-verify.middleware.ts';

const SECRET = 'a-very-long-origin-secret-value';

function run(path: string, header?: string) {
  const req = {
    path,
    originalUrl: path,
    headers: header ? { 'x-origin-verify': header } : {},
  } as unknown as Request;
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
  const next = jest.fn() as NextFunction;
  originVerify(SECRET)(req, res, next);
  return { res, next };
}

describe('originVerify', () => {
  it('passes requests carrying the secret', () => {
    const { next, res } = run('/api/posts', SECRET);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', undefined],
    ['wrong', 'nope'],
    ['same length but different', SECRET.replace(/.$/, 'X')],
  ])('rejects a %s header with 403', (_label, header) => {
    const { next, res } = run('/api/posts', header);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('exempts the local readiness probe', () => {
    const { next } = run('/api/health/live');
    expect(next).toHaveBeenCalled();
  });
});
