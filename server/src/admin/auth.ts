import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { compare } from 'bcryptjs';
import { ApiError } from '../booking/errors.js';
import { AdminSession, AdminUser } from './models.js';
import { limitBooking } from '../booking/routes.js';

export interface AdminOptions {
  origin: string;
  secureCookies: boolean;
  sessionMinutes: number;
  demoMode: boolean;
}
export const defaultAdminOptions: AdminOptions = {
  origin: 'http://127.0.0.1:5173',
  secureCookies: false,
  sessionMinutes: 60,
  demoMode: false,
};
export const sessionCookie = 'sn_admin';
const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');

function cookieToken(req: Request) {
  const cookie = req.headers.cookie
    ?.split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${sessionCookie}=`))
    ?.slice(sessionCookie.length + 1);
  return cookie && /^[A-Za-z0-9_-]{43}$/.test(cookie) ? cookie : null;
}
export function checkOrigin(req: Request, options: AdminOptions) {
  if (req.get('Origin') !== options.origin)
    throw new ApiError(403, 'CSRF_REJECTED', 'Request origin is not allowed');
}
export async function requireSession(req: Request, options: AdminOptions) {
  const token = cookieToken(req);
  const session = token
    ? await AdminSession.findOne({
        _id: digest(token),
        expiresAt: { $gt: new Date() },
      }).lean()
    : null;
  if (!session || (session.scope === 'demo' && !options.demoMode))
    throw new ApiError(401, 'UNAUTHORIZED', 'Sign in to continue');
  if (!['GET', 'HEAD'].includes(req.method)) {
    checkOrigin(req, options);
    const csrf = req.get('X-CSRF-Token') ?? '';
    const expected = Buffer.from(session.csrf);
    const supplied = Buffer.from(csrf);
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    )
      throw new ApiError(
        403,
        'CSRF_REJECTED',
        'Refresh your session and try again',
      );
  }
  return session;
}
const cookieOptions = (options: AdminOptions) => ({
  httpOnly: true,
  secure: options.secureCookies,
  sameSite: 'strict' as const,
  path: '/api/admin',
});
export async function startSession(
  req: Request,
  res: Response,
  scope: 'owner' | 'demo',
  options: AdminOptions,
) {
  const previous = cookieToken(req);
  if (previous) await AdminSession.deleteOne({ _id: digest(previous) });
  const token = randomBytes(32).toString('base64url');
  const csrf = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + options.sessionMinutes * 60000);
  await AdminSession.create({ _id: digest(token), scope, csrf, expiresAt });
  res.cookie(sessionCookie, token, {
    ...cookieOptions(options),
    maxAge: options.sessionMinutes * 60000,
  });
  return {
    authenticated: true,
    scope,
    csrf,
    expiresAt: expiresAt.toISOString(),
  };
}
export async function login(req: Request, email: string, password: string) {
  await limitBooking(`login:${req.ip ?? 'unknown'}`, 5);
  const user = await AdminUser.findById('administrator').lean();
  if (
    !user ||
    user.email !== email ||
    !(await compare(password, user.passwordHash))
  )
    throw new ApiError(
      401,
      'INVALID_CREDENTIALS',
      'Email or password is incorrect',
    );
}
export async function logout(
  req: Request,
  res: Response,
  options: AdminOptions,
) {
  const token = cookieToken(req);
  if (token) await AdminSession.deleteOne({ _id: digest(token) });
  res.clearCookie(sessionCookie, cookieOptions(options));
}
