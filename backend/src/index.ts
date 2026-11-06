import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import sharp, { type Metadata } from 'sharp';
import { z } from 'zod';
import swaggerUi from 'swagger-ui-express';
import { openapi } from './openapi.js';
import { createMailer } from './mailer.js';
import { getStorageDriver, cleanupOrphanedUploads, validateImageBuffer } from './storage.js';
import {
  calculateCustomStickerUnitPrice,
  calculateCustomPackUnitPrice,
  calculateCustomWallUnitPrice,
  CustomLineSchema,
  WALL_LAYOUTS,
  CUSTOM_STICKER_SIZES,
  CUSTOM_STICKER_FINISHES,
  CUSTOM_PACK_SIZES,
  CUSTOM_PACK_FINISHES,
} from './pricing.js';
import {
  awardPassportStamp,
  reversePassportStamp,
  getCustomerPassport,
  getOrCreatePassportRule,
} from './passportService.js';
import { getActiveProposals } from './votingService.js';

const configSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.string().default('development'),
  TRUST_PROXY: z.string().default('1'),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).optional(),
  COOKIE_DOMAIN: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z.coerce.boolean().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  DELIVERY_FEE: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  UPI_ID: z.string().optional(),
  UPI_QR_URL: z.string().optional(),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(15),
  STORAGE_DRIVER: z.string().default('local'),
  STORAGE_LOCAL_DIR: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
});

const envResult = configSchema.safeParse(process.env);
if (!envResult.success) {
  const issues = envResult.error.issues
    .map((iss) => `  - ${iss.path.join('.')}: ${iss.message}`)
    .join('\n');
  console.error('\n❌ FATAL: Environment validation failed on boot:\n' + issues + '\n');
  process.exit(1);
}
const config = envResult.data;

export function logger(level: 'info' | 'warn' | 'error', message: string, meta: Record<string, any> = {}) {
  const timestamp = new Date().toISOString();
  if (config.NODE_ENV === 'production') {
    console.log(JSON.stringify({ timestamp, level, message, ...meta }));
  } else {
    const colors = {
      info: '\x1b[36m[INFO]\x1b[0m',
      warn: '\x1b[33m[WARN]\x1b[0m',
      error: '\x1b[31m[ERROR]\x1b[0m',
    };
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    console.log(`${colors[level]} ${timestamp} - ${message}${metaStr}`);
  }
}

const db = new PrismaClient();
const mailer = createMailer({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
  user: config.SMTP_USER,
  pass: config.SMTP_PASS,
  from: config.SMTP_FROM,
  frontendOrigin: config.FRONTEND_ORIGIN.split(',')[0].trim(),
  nodeEnv: config.NODE_ENV,
});

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', Number(config.TRUST_PROXY) || config.TRUST_PROXY);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
const uploadsDir = fs.existsSync(path.resolve(process.cwd(), 'backend', 'uploads', 'products'))
  ? path.resolve(process.cwd(), 'backend', 'uploads', 'products')
  : path.resolve(process.cwd(), 'uploads', 'products');

app.use(
  '/api/uploads/products',
  (_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(uploadsDir, { maxAge: '30d' })
);
const allowedOrigins = config.FRONTEND_ORIGIN.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);

// Structured HTTP Request Logger (Sanitized: never logs query strings or credentials)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/api/health') {
      logger('info', `${req.method} ${req.path} ${res.statusCode} (${duration}ms)`, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: duration,
      });
    }
  });
  next();
});

// Rate limiters
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
const orderLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many order requests. Please slow down.' },
});
const cartLimit = rateLimit({ windowMs: 1 * 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false });

const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const secret = () => randomBytes(48).toString('base64url');

const cookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: (config.COOKIE_SAME_SITE ?? 'lax') as 'strict' | 'lax',
  path: '/api/auth',
  ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
};

type Session = { id: string; role: 'CUSTOMER' | 'ADMIN' };
type Authed = Request & { session?: Session };

const access = (s: Session) =>
  jwt.sign(
    { sub: s.id, role: s.role, purpose: 'access', iss: 'sticker-club', aud: 'sticker-club-storefront' },
    config.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '15m',
    }
  );
const safeUser = (u: { id: string; name: string; email: string; role: string; phone?: string | null }) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  phone: u.phone,
});

const issue = async (res: Response, u: Session) => {
  const raw = secret();
  await db.refreshToken.create({ data: { userId: u.id, tokenHash: hash(raw), expiresAt: new Date(Date.now() + 30 * 86400000) } });
  res.cookie('sc_refresh', raw, { ...cookieOptions, maxAge: 30 * 86400000 });
  return access(u);
};

// Explicit verifier for local legacy/Express JWTs
function verifyLocalSessionToken(rawToken: string): { userId: string; role: 'CUSTOMER' | 'ADMIN' } | null {
  try {
    const p = jwt.verify(rawToken, config.JWT_SECRET, { algorithms: ['HS256'] }) as any;
    if (typeof p === 'object' && p !== null && p.sub) {
      // Reject artwork-scoped tokens or wrong-purpose tokens on general endpoints
      if (p.purpose && p.purpose !== 'access') {
        return null;
      }
      if (p.scope && p.scope !== 'access') {
        return null;
      }
      // Validate audience and issuer if present
      if (p.aud && p.aud !== 'sticker-club-storefront') {
        return null;
      }
      if (p.iss && p.iss !== 'sticker-club') {
        return null;
      }
      const role: 'CUSTOMER' | 'ADMIN' = p.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';
      return { userId: String(p.sub), role };
    }
  } catch {
    // Cryptographic signature check failed or expired
  }
  return null;
}

// Explicit verifier for genuine Supabase session JWTs
function verifySupabaseSessionToken(rawToken: string): { userId: string; email?: string; name?: string } | null {
  const secret = config.SUPABASE_JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    // Fail closed: if signing secret for Supabase is not configured, cannot verify cryptographic signature
    return null;
  }
  try {
    const p = jwt.verify(rawToken, secret, { algorithms: ['HS256'] }) as any;
    if (typeof p === 'object' && p !== null && p.sub) {
      // Validate audience
      if (p.aud !== 'authenticated') {
        return null;
      }
      // Validate issuer matches configured Supabase URL or project
      const expectedUrl = config.SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      if (expectedUrl) {
        try {
          const expectedHost = new URL(expectedUrl).host;
          const tokenIss = p.iss ? new URL(p.iss).host : '';
          if (expectedHost && tokenIss && expectedHost !== tokenIss) {
            return null;
          }
        } catch {
          if (p.iss && !p.iss.includes('supabase')) return null;
        }
      } else if (p.iss && !p.iss.includes('supabase')) {
        return null;
      }

      const email = typeof p.email === 'string' ? p.email : undefined;
      const name = typeof p.user_metadata?.name === 'string'
        ? p.user_metadata.name
        : typeof p.user_metadata?.full_name === 'string'
        ? p.user_metadata.full_name
        : (email ? email.split('@')[0] : 'Customer');

      return { userId: String(p.sub), email, name };
    }
  } catch {
    // Cryptographic signature check failed or expired: fail closed
  }
  return null;
}

const requireAuth = async (req: Authed, res: Response, next: NextFunction) => {
  const b = req.headers.authorization;
  if (!b?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Login required' });
    return;
  }
  const rawToken = b.slice(7).trim();
  if (!rawToken) {
    res.status(401).json({ error: 'Login required' });
    return;
  }

  try {
    // Explicit verifiers only. NO unverified jwt.decode fallback!
    const local = verifyLocalSessionToken(rawToken);
    if (local) {
      const u = await db.user.findUnique({ where: { id: local.userId }, select: { id: true, role: true } });
      if (!u) {
        res.status(401).json({ error: 'Account unavailable' });
        return;
      }
      req.session = { id: u.id, role: u.role };
      next();
      return;
    }

    const supa = verifySupabaseSessionToken(rawToken);
    if (supa) {
      let u = await db.user.findUnique({ where: { id: supa.userId }, select: { id: true, role: true } });
      if (!u) {
        // Auto-mirror new Supabase user into database strictly with role: 'CUSTOMER'
        // Never trust editable user metadata for ADMIN role.
        const email = supa.email || `${supa.userId}@supabase.user`;
        const name = supa.name || email.split('@')[0];
        u = await db.user.create({
          data: {
            id: supa.userId,
            email,
            name,
            passwordHash: '',
            role: 'CUSTOMER',
          },
          select: { id: true, role: true },
        });
      }
      req.session = { id: u.id, role: u.role };
      next();
      return;
    }

    // Both verifiers rejected the token (invalid signature, expired, wrong purpose, wrong audience/issuer)
    res.status(401).json({ error: 'Invalid or expired session' });
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
};

const admin = (req: Authed, res: Response, next: NextFunction) => {
  if (req.session?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
};

function createArtworkViewToken(userId: string, role: string, artworkId: string): string {
  return jwt.sign(
    {
      sub: userId,
      role: role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
      artworkId,
      purpose: 'artwork:read',
    },
    config.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '15m',
    }
  );
}

const requireArtworkAuth = async (req: Authed, res: Response, next: NextFunction) => {
  let token: string | undefined;
  const b = req.headers.authorization;
  if (b?.startsWith('Bearer ')) {
    token = b.slice(7).trim();
  } else if (typeof req.query.token === 'string') {
    // Query tokens are accepted ONLY on artwork file/download routes!
    const isArtworkRoute = req.path.includes('/api/uploads/artwork/') || req.path.includes('/api/artwork/');
    if (!isArtworkRoute) {
      res.status(401).json({ error: 'Query token not permitted on general endpoints' });
      return;
    }
    token = req.query.token.trim();
  }

  if (!token) {
    res.status(401).json({ error: 'Login or token required' });
    return;
  }

  try {
    const targetArtworkId = String(req.params.id);

    // 1. Check artwork-specific token (purpose: 'artwork:read')
    try {
      const p = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] }) as any;
      if (typeof p === 'object' && p !== null) {
        if (p.purpose === 'artwork:read' || p.scope === 'artwork-view') {
          // Bind to requested artwork: reject cross-file replay!
          if (p.artworkId !== targetArtworkId) {
            res.status(403).json({ error: 'Forbidden: token not valid for requested artwork' });
            return;
          }
          req.session = { id: String(p.sub), role: p.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER' };
          next();
          return;
        }
      }
    } catch {
      // Not a valid artwork token; continue to standard session check
    }

    // 2. Check general user session token (Bearer header only; never accept query token for general sessions)
    if (b?.startsWith('Bearer ')) {
      const local = verifyLocalSessionToken(token);
      if (local) {
        const u = await db.user.findUnique({ where: { id: local.userId }, select: { id: true, role: true } });
        if (u) {
          req.session = { id: u.id, role: u.role };
          next();
          return;
        }
      }

      const supa = verifySupabaseSessionToken(token);
      if (supa) {
        let u = await db.user.findUnique({ where: { id: supa.userId }, select: { id: true, role: true } });
        if (!u) {
          u = await db.user.create({
            data: {
              id: supa.userId,
              email: supa.email || `${supa.userId}@supabase.user`,
              name: supa.name || 'Customer',
              passwordHash: '',
              role: 'CUSTOMER',
            },
            select: { id: true, role: true },
          });
        }
        if (u) {
          req.session = { id: u.id, role: u.role };
          next();
          return;
        }
      }
    }

    res.status(401).json({ error: 'Invalid or expired session or token' });
  } catch {
    res.status(401).json({ error: 'Invalid or expired session or token' });
  }
};

const sameOrigin = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (!origin || !allowedOrigins.includes(origin)) {
    res.status(403).json({ error: 'Invalid origin' });
    return;
  }
  next();
};

const wrap = (fn: (req: Authed, res: Response) => Promise<void>) => (req: Authed, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res)).catch(next);

/**
 * Bounded retry helper for Prisma Serializable transaction conflicts (P2034).
 */
async function withSerializableRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: unknown) {
      attempt++;
      const isConflict =
        (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2034') ||
        (err instanceof Error && (err.message.includes('P2034') || err.message.includes('could not serialize access')));

      if (isConflict && attempt < maxRetries) {
        const delay = Math.floor(Math.random() * 40) + attempt * 40;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      if (isConflict) {
        throw Object.assign(new Error('System is busy processing transactions. Please try again.'), { status: 409 });
      }
      throw err;
    }
  }
}

/**
 * Transactional stock change audit recorder.
 */
async function recordStockMovement(
  tx: Prisma.TransactionClient,
  params: {
    productId: string;
    delta: number;
    quantityAfter: number;
    reason: 'ORDER' | 'CANCELLATION' | 'ADMIN_ADJUSTMENT' | 'RESTOCK';
    orderId?: string;
    actorUserId?: string;
  }
) {
  await tx.inventoryMovement.create({
    data: {
      productId: params.productId,
      delta: params.delta,
      quantityAfter: params.quantityAfter,
      reason: params.reason,
      orderId: params.orderId,
      actorUserId: params.actorUserId,
    },
  });
  // Write backwards-compatible StockChange row
  await tx.stockChange.create({
    data: {
      productId: params.productId,
      actorId: params.actorUserId ?? null,
      before: params.quantityAfter - params.delta,
      after: params.quantityAfter,
      reason: params.reason,
    },
  });
}

const credentials = z.object({ email: z.email().max(254).transform((s) => s.trim().toLowerCase()), password: z.string().min(12).max(128) });

app.get('/api/health', async (_req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.json({
      ok: true,
      db: true,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    });
  } catch (error) {
console.error('DATABASE HEALTH ERROR:', error);
    res.status(503).json({
      ok: false,
      db: false,
      error: 'Database ping failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// Swagger docs only available in non-production environments
if (config.NODE_ENV !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));
}

app.post(
  '/api/auth/register',
  authLimit,
  wrap(async (req, res) => {
    const data = credentials.extend({ name: z.string().trim().min(1).max(100) }).parse(req.body);
    if (await db.user.findUnique({ where: { email: data.email } })) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    const user = await db.user.create({ data: { email: data.email, name: data.name, passwordHash: await bcrypt.hash(data.password, 12), role: 'CUSTOMER' } });
    res.status(201).json({ user: safeUser(user), accessToken: await issue(res, { id: user.id, role: user.role }) });
  })
);

app.post(
  '/api/auth/login',
  authLimit,
  wrap(async (req, res) => {
    const data = credentials.parse(req.body);
    const u = await db.user.findUnique({ where: { email: data.email } });
    if (!u || !(await bcrypt.compare(data.password, u.passwordHash))) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    res.json({ user: safeUser(u), accessToken: await issue(res, { id: u.id, role: u.role }) });
  })
);

app.post(
  '/api/auth/refresh',
  authLimit,
  sameOrigin,
  wrap(async (req, res) => {
    const raw = req.cookies?.sc_refresh as string | undefined;
    const token = raw ? await db.refreshToken.findUnique({ where: { tokenHash: hash(raw) } }) : null;
    if (!token || token.expiresAt <= new Date()) {
      res.status(401).json({ error: 'Session expired' });
      return;
    }
    if (token.revokedAt) {
      // Reuse detected! Compromised token family -> revoke all sessions for this user
      await db.refreshToken.updateMany({ where: { userId: token.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      res.status(401).json({ error: 'Session was already used (reuse detected)' });
      return;
    }
    const u = await db.user.findUnique({ where: { id: token.userId } });
    if (!u) {
      res.status(401).json({ error: 'Session expired' });
      return;
    }
    const changed = await db.refreshToken.updateMany({ where: { id: token.id, revokedAt: null }, data: { revokedAt: new Date() } });
    if (changed.count !== 1) {
      await db.refreshToken.updateMany({ where: { userId: u.id, revokedAt: null }, data: { revokedAt: new Date() } });
      res.status(401).json({ error: 'Session was already used' });
      return;
    }
    res.json({ user: safeUser(u), accessToken: await issue(res, { id: u.id, role: u.role }) });
  })
);

app.post(
  '/api/auth/logout',
  sameOrigin,
  wrap(async (req, res) => {
    const raw = req.cookies?.sc_refresh as string | undefined;
    if (raw) await db.refreshToken.updateMany({ where: { tokenHash: hash(raw) }, data: { revokedAt: new Date() } });
    res.clearCookie('sc_refresh', cookieOptions);
    res.json({ ok: true });
  })
);

app.post(
  '/api/auth/forgot-password',
  authLimit,
  sameOrigin,
  wrap(async (req, res) => {
    const { email } = z.object({ email: z.email().transform((s) => s.toLowerCase()) }).parse(req.body);
    const u = await db.user.findUnique({ where: { email } });
    if (u) {
      const raw = secret();
      await db.passwordResetToken.create({
        data: { userId: u.id, tokenHash: hash(raw), expiresAt: new Date(Date.now() + 15 * 60000) },
      });
      await mailer.sendPasswordResetEmail(email, raw);
    }
    res.json({ message: 'If the account exists, password reset instructions have been sent.' });
  })
);

app.post(
  '/api/auth/reset-password',
  authLimit,
  sameOrigin,
  wrap(async (req, res) => {
    const { token, password } = z.object({ token: z.string().min(20), password: z.string().min(12).max(128) }).parse(req.body);
    const rec = await db.passwordResetToken.findUnique({ where: { tokenHash: hash(token) } });
    if (!rec || rec.usedAt || rec.expiresAt <= new Date()) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const completed = await db.$transaction(async (tx) => {
      const changed = await tx.passwordResetToken.updateMany({ where: { id: rec.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (changed.count !== 1) return false;
      await tx.user.update({ where: { id: rec.userId }, data: { passwordHash } });
      await tx.refreshToken.updateMany({ where: { userId: rec.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      return true;
    });
    if (!completed) {
      res.status(400).json({ error: 'Reset token already used or expired' });
      return;
    }
    res.json({ ok: true });
  })
);

app.get(
  '/api/me',
  requireAuth,
  wrap(async (req, res) => {
    const u = await db.user.findUnique({ where: { id: req.session!.id } });
    if (!u) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(safeUser(u));
  })
);

app.patch(
  '/api/me',
  requireAuth,
  wrap(async (req, res) => {
    const data = z.object({ name: z.string().trim().min(1).max(100).optional(), phone: z.string().max(30).nullable().optional() }).parse(req.body);
    res.json(safeUser(await db.user.update({ where: { id: req.session!.id }, data })));
  })
);

app.post(
  '/api/me/password',
  authLimit,
  requireAuth,
  wrap(async (req, res) => {
    const { currentPassword, newPassword } = z
      .object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(12).max(128),
      })
      .parse(req.body);
    const user = await db.user.findUnique({ where: { id: req.session!.id } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      res.status(403).json({ error: 'Current password is incorrect' });
      return;
    }
    if (currentPassword === newPassword) {
      res.status(400).json({ error: 'Choose a different password' });
      return;
    }
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
      await tx.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    });
    res.clearCookie('sc_refresh', cookieOptions);
    res.json({ message: 'Password updated. Sign in again on all devices.' });
  })
);

app.get(
  '/api/me/addresses',
  requireAuth,
  wrap(async (req, res) => {
    res.json(await db.address.findMany({ where: { userId: req.session!.id } }));
  })
);

const addressInput = z.object({
  recipient: z.string().min(1).max(100),
  line1: z.string().min(1).max(250),
  line2: z.string().max(250).optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(3).max(15),
  isDefault: z.boolean().default(false),
});

app.post(
  '/api/me/addresses',
  requireAuth,
  wrap(async (req, res) => {
    const data = addressInput.parse(req.body);
    const a = await db.$transaction(async (tx) => {
      if (data.isDefault) await tx.address.updateMany({ where: { userId: req.session!.id }, data: { isDefault: false } });
      return tx.address.create({ data: { ...data, userId: req.session!.id } });
    });
    res.status(201).json(a);
  })
);

app.patch(
  '/api/me/addresses/:id',
  requireAuth,
  wrap(async (req, res) => {
    const data = addressInput.partial().parse(req.body);
    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'Provide at least one address field' });
      return;
    }
    const existing = await db.address.findFirst({ where: { id: String(req.params.id), userId: req.session!.id } });
    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const updated = await db.$transaction(async (tx) => {
      if (data.isDefault) await tx.address.updateMany({ where: { userId: req.session!.id }, data: { isDefault: false } });
      return tx.address.update({ where: { id: existing.id }, data });
    });
    res.json(updated);
  })
);

app.post(
  '/api/me/addresses/:id/default',
  requireAuth,
  wrap(async (req, res) => {
    const result = await db.$transaction(async (tx) => {
      const owned = await tx.address.findFirst({ where: { id: String(req.params.id), userId: req.session!.id }, select: { id: true } });
      if (!owned) return false;
      await tx.address.updateMany({ where: { userId: req.session!.id }, data: { isDefault: false } });
      await tx.address.update({ where: { id: owned.id }, data: { isDefault: true } });
      return true;
    });
    if (!result) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ ok: true });
  })
);

app.delete(
  '/api/me/addresses/:id',
  requireAuth,
  wrap(async (req, res) => {
    const result = await db.address.deleteMany({ where: { id: String(req.params.id), userId: req.session!.id } });
    if (!result.count) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ ok: true });
  })
);

const cartItemInput = z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(99), variantId: z.string().max(80).optional() });
const getCart = async (userId: string) =>
  db.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: { items: { include: { product: { include: { images: true, inventory: true, categories: true, variants: true } } } } },
  });

app.get(
  '/api/cart',
  requireAuth,
  wrap(async (req, res) => {
    res.json(await getCart(req.session!.id));
  })
);

app.post(
  '/api/cart/items',
  cartLimit,
  requireAuth,
  wrap(async (req, res) => {
    const { productId, quantity, variantId: requestedVariant } = cartItemInput.parse(req.body);
    const variantId = requestedVariant ?? '';
    const product = await db.product.findFirst({ where: { id: productId, active: true }, include: { inventory: true, variants: true } });
    if (!product) {
      res.status(404).json({ error: 'Product unavailable' });
      return;
    }
    if (!product.inventory) {
      res.status(409).json({ error: 'Stock has not been configured for this product' });
      return;
    }
    if (product.variants.length && !product.variants.some((v) => v.id === variantId)) {
      res.status(400).json({ error: 'Choose a valid product option' });
      return;
    }
    if (!product.variants.length && variantId) {
      res.status(400).json({ error: 'This product does not offer variants' });
      return;
    }
    if (product.inventory.quantity < quantity) {
      res.status(409).json({ error: 'Not enough stock', available: product.inventory.quantity });
      return;
    }

    const item = await withSerializableRetry(async () => {
      return db.$transaction(
        async (tx) => {
          const cart = await tx.cart.upsert({ where: { userId: req.session!.id }, create: { userId: req.session!.id }, update: {} });
          const previous = await tx.cartItem.findUnique({ where: { cartId_productId_variantId: { cartId: cart.id, productId, variantId } } });
          const next = (previous?.quantity ?? 0) + quantity;
          if (next > 99) throw Object.assign(new Error('Maximum 99 of one option per cart'), { status: 400 });
          const stored = await tx.cartItem.aggregate({ where: { cartId: cart.id, productId }, _sum: { quantity: true } });
          const stock = await tx.inventory.findUnique({ where: { productId } });
          if (!stock || stock.quantity < (stored._sum.quantity ?? 0) + quantity) {
            throw Object.assign(new Error('Not enough stock for all selected variants'), { status: 409 });
          }
          return tx.cartItem.upsert({
            where: { cartId_productId_variantId: { cartId: cart.id, productId, variantId } },
            create: { cartId: cart.id, productId, variantId, quantity },
            update: { quantity: next },
          });
        },
        { isolationLevel: 'Serializable' }
      );
    });
    res.status(201).json(item);
  })
);

app.patch(
  '/api/cart/items/:id',
  cartLimit,
  requireAuth,
  wrap(async (req, res) => {
    const { quantity } = z.object({ quantity: z.number().int().min(1).max(99) }).parse(req.body);
    const cart = await db.cart.findUnique({ where: { userId: req.session!.id } });
    if (!cart) {
      res.status(404).json({ error: 'Cart not found' });
      return;
    }
    const item = await db.cartItem.findFirst({ where: { id: String(req.params.id), cartId: cart.id }, include: { product: { include: { inventory: true } } } });
    if (!item) {
      res.status(404).json({ error: 'Cart item not found' });
      return;
    }
    if (!item.product.inventory) {
      res.status(409).json({ error: 'Stock is not configured for this product' });
      return;
    }
    const other = await db.cartItem.aggregate({ where: { cartId: cart.id, productId: item.productId, id: { not: item.id } }, _sum: { quantity: true } });
    if (item.product.inventory.quantity < (other._sum.quantity ?? 0) + quantity) {
      res.status(409).json({ error: 'Not enough stock across variants', available: item.product.inventory.quantity });
      return;
    }
    res.json(await db.cartItem.update({ where: { id: item.id }, data: { quantity } }));
  })
);

app.delete(
  '/api/cart/items/:id',
  cartLimit,
  requireAuth,
  wrap(async (req, res) => {
    const cart = await db.cart.findUnique({ where: { userId: req.session!.id } });
    if (!cart) {
      res.status(404).json({ error: 'Cart not found' });
      return;
    }
    const result = await db.cartItem.deleteMany({ where: { id: String(req.params.id), cartId: cart.id } });
    if (!result.count) {
      res.status(404).json({ error: 'Cart item not found' });
      return;
    }
    res.json({ ok: true });
  })
);

app.delete(
  '/api/cart',
  requireAuth,
  wrap(async (req, res) => {
    const cart = await db.cart.findUnique({ where: { userId: req.session!.id } });
    if (cart) await db.cartItem.deleteMany({ where: { cartId: cart.id } });
    res.json({ ok: true });
  })
);

// Client-facing availability review uses authoritative database prices
app.get(
  '/api/checkout/availability',
  requireAuth,
  wrap(async (req, res) => {
    const cart = await getCart(req.session!.id);
    res.json({
      items: cart.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        name: item.product.name,
        price: (item.product.variants.find((v) => v.id === item.variantId)?.price ?? item.product.price).toString(),
        active: item.product.active,
        available: item.product.inventory?.quantity ?? null,
      })),
    });
  })
);

app.get('/api/payment/config', (_req, res) => {
  res.json({
    upiId: config.UPI_ID || null,
    upiQrUrl: config.UPI_QR_URL || null,
    deliveryFee: config.DELIVERY_FEE || null,
  });
});

// Analytics & Popularity Ranking endpoints
const analyticsLimit = rateLimit({ windowMs: 1 * 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false });

app.post(
  '/api/analytics/activity',
  analyticsLimit,
  wrap(async (req, res) => {
    // Reject public PURCHASE submissions: purchases must be recorded authoritatively from server transactions
    if (req.body?.type === 'PURCHASE') {
      res.status(400).json({
        error: 'Public purchase submission is not permitted. Purchases are derived authoritatively from confirmed orders.',
      });
      return;
    }

    const { productId, type, sessionId } = z
      .object({
        productId: z.string().min(1).max(100),
        type: z.enum(['VIEW', 'CART']),
        sessionId: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/).optional(),
      })
      .parse(req.body);

    // Verify product exists to prevent garbage / resource exhaustion
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    try {
      const sId = sessionId || 'anonymous';
      await db.productActivity.upsert({
        where: { productId_type_sessionId: { productId, type, sessionId: sId } },
        update: {},
        create: { productId, type, sessionId: sId },
      });
      res.json({ ok: true });
    } catch {
      res.json({ ok: true, notice: 'Event already recorded' });
    }
  })
);

app.get(
  '/api/analytics/popularity',
  wrap(async (_req, res) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activities = await db.productActivity.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { productId: true, type: true },
    });

    const scores: Record<string, number> = {};
    for (const a of activities) {
      if (!scores[a.productId]) scores[a.productId] = 0;
      if (a.type === 'VIEW') scores[a.productId] += 1;
      else if (a.type === 'CART') scores[a.productId] += 3;
      else if (a.type === 'PURCHASE') scores[a.productId] += 10;
    }

    res.json({ scores });
  })
);

// Artwork upload configuration & helpers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
  },
});

function detectImageMagic(buffer: Buffer): { ext: string; mimeType: string } | null {
  if (buffer.length < 12) return null;

  // Reject DOS/PE executable ('MZ' - 0x4D 0x5A)
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) return null;
  // Reject ELF ('\x7FELF' - 0x7F 0x45 0x4C 0x46)
  if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) return null;

  // Reject SVG / XML / HTML / script in buffer
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096)).toString('utf-8', 0).toLowerCase();
  if (
    sample.includes('<svg') ||
    sample.includes('<?xml') ||
    sample.includes('<html') ||
    sample.includes('<script') ||
    sample.includes('<!doctype')
  ) {
    return null;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: '.png', mimeType: 'image/png' };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: '.jpg', mimeType: 'image/jpeg' };
  }

  // WebP: RIFF ... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { ext: '.webp', mimeType: 'image/webp' };
  }

  return null;
}

app.post(
  '/api/uploads/artwork',
  requireAuth,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ error: `File size exceeds limit of ${config.MAX_UPLOAD_SIZE_MB}MB` });
            return;
          }
          res.status(400).json({ error: err.message });
          return;
        }
        res.status(400).json({ error: err.message || 'File upload error' });
        return;
      }
      next();
    });
  },
  wrap(async (req, res) => {
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ error: 'No artwork file uploaded' });
      return;
    }

    const validated = await validateImageBuffer(req.file.buffer, req.file.originalname, req.file.mimetype, false);
    const storage = getStorageDriver();
    await storage.save(validated.sanitizedBuffer, validated.fileName, validated.mimeType, false);

    const rawName = path.basename(req.file.originalname || 'artwork');
    const safeOriginalName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);

    let artwork;
    try {
      artwork = await db.customArtwork.create({
        data: {
          userId: req.session!.id,
          mimeType: validated.mimeType,
          originalName: safeOriginalName,
          fileName: validated.fileName,
          fileSize: validated.sanitizedBuffer.length,
          width: validated.width ?? null,
          height: validated.height ?? null,
          role: 'customer-upload',
        },
      });
    } catch (dbErr) {
      await storage.delete(validated.fileName, false).catch(() => {});
      throw dbErr;
    }

    res.status(201).json({
      id: artwork.id,
      fileName: artwork.fileName,
      originalName: artwork.originalName,
      mimeType: artwork.mimeType,
      width: artwork.width,
      height: artwork.height,
      url: `/api/uploads/artwork/${artwork.id}/file`,
    });
  })
);

app.post(
  '/api/admin/uploads/product-image',
  requireAuth,
  admin,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ error: `File size exceeds limit of ${config.MAX_UPLOAD_SIZE_MB}MB` });
            return;
          }
          res.status(400).json({ error: err.message });
          return;
        }
        res.status(400).json({ error: err.message || 'File upload error' });
        return;
      }
      next();
    });
  },
  wrap(async (req, res) => {
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ error: 'No product image uploaded' });
      return;
    }

    const validated = await validateImageBuffer(req.file.buffer, req.file.originalname, req.file.mimetype, true);
    const storage = getStorageDriver();
    await storage.save(validated.sanitizedBuffer, validated.fileName, validated.mimeType, true);

    const publicUrl = `/api/uploads/products/${validated.fileName}`;
    res.status(201).json({
      url: publicUrl,
      fileName: validated.fileName,
      mimeType: validated.mimeType,
      width: validated.width,
      height: validated.height,
    });
  })
);

app.get(
  '/api/uploads/products/:filename',
  wrap(async (req, res) => {
    const filename = path.basename(String(req.params.filename));
    const storage = getStorageDriver();
    const exists = await storage.exists(filename, true);
    if (!exists) {
      res.status(404).json({ error: 'Product image not found' });
      return;
    }
    const buf = await storage.read(filename, true);
    let mime = 'image/png';
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) mime = 'image/jpeg';
    else if (filename.endsWith('.webp')) mime = 'image/webp';
    else if (filename.endsWith('.svg')) mime = 'image/svg+xml';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(buf);
  })
);

app.get(
  '/api/uploads/artwork/:id/file',
  requireArtworkAuth,
  wrap(async (req, res) => {
    const artwork = await db.customArtwork.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!artwork) {
      res.status(404).json({ error: 'Artwork not found' });
      return;
    }

    const isOwner = artwork.userId === req.session!.id;
    const isAdmin = req.session!.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'Forbidden: you do not have permission to access this artwork' });
      return;
    }

    const storage = getStorageDriver();
    const exists = await storage.exists(artwork.fileName, false);
    if (!exists) {
      res.status(404).json({ error: 'Artwork file not found in storage' });
      return;
    }

    res.setHeader('Content-Type', artwork.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(artwork.originalName)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-transform, no-cache');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    const stream = await storage.readStream(artwork.fileName, false);
    stream.pipe(res);
  })
);

app.get(
  '/api/uploads/artwork/:id/download',
  requireArtworkAuth,
  wrap(async (req, res) => {
    const artwork = await db.customArtwork.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!artwork) {
      res.status(404).json({ error: 'Artwork not found' });
      return;
    }

    const isOwner = artwork.userId === req.session!.id;
    const isAdmin = req.session!.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'Forbidden: you do not have permission to access this artwork' });
      return;
    }

    const storage = getStorageDriver();
    const exists = await storage.exists(artwork.fileName, false);
    if (!exists) {
      res.status(404).json({ error: 'Artwork file not found in storage' });
      return;
    }

    res.setHeader('Content-Type', artwork.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(artwork.originalName)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-transform, no-cache');

    const stream = await storage.readStream(artwork.fileName, false);
    stream.pipe(res);
  })
);

app.get(
  '/api/uploads/artwork/:id/token',
  requireAuth,
  wrap(async (req, res) => {
    const artwork = await db.customArtwork.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!artwork) {
      res.status(404).json({ error: 'Artwork not found' });
      return;
    }

    const isOwner = artwork.userId === req.session!.id;
    const isAdmin = req.session!.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const token = createArtworkViewToken(req.session!.id, req.session!.role, artwork.id);
    res.json({ token });
  })
);

app.post(
  '/api/admin/uploads/cleanup',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const maxAgeHours = Number(req.body.maxAgeHours) || 24;
    const result = await cleanupOrphanedUploads(db, maxAgeHours);
    res.json({ success: true, ...result });
  })
);

app.post(
  '/api/orders',
  orderLimit,
  requireAuth,
  wrap(async (req, res) => {
    const rawKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
      res.status(400).json({ error: 'Idempotency-Key header is required' });
      return;
    }
    const idempotencyKey = rawKey.trim();

    const { addressId, paymentMethod, customLines, clearServerCart, phone } = z
      .object({
        addressId: z.string().min(1),
        paymentMethod: z.enum(['UPI', 'COD']),
        phone: z.string().optional(),
        customLines: z.array(CustomLineSchema).optional(),
        clearServerCart: z.boolean().optional(),
      })
      .parse(req.body);

    if (config.DELIVERY_FEE === undefined) {
      res.status(400).json({ error: 'delivery fee not configured' });
      return;
    }
    const deliveryFee = new Prisma.Decimal(config.DELIVERY_FEE);
    const userId = req.session!.id;

    // Fast check for replay outside transaction
    const existing = await db.order.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      include: {
        items: true,
        customOrders: { include: { artwork: true, artworks: { include: { artwork: true } } } },
        payment: true,
      },
    });
    if (existing) {
      res.status(200).json(existing);
      return;
    }

    const { order, isReplay } = await withSerializableRetry(async () => {
      return db.$transaction(
        async (tx) => {
          // Re-check replay inside transaction
          const replayed = await tx.order.findUnique({
            where: { userId_idempotencyKey: { userId, idempotencyKey } },
            include: {
              items: true,
              customOrders: { include: { artwork: true, artworks: { include: { artwork: true } } } },
              payment: true,
            },
          });
          if (replayed) return { order: replayed, isReplay: true };

          const address = await tx.address.findFirst({ where: { id: addressId, userId } });
          if (!address) throw Object.assign(new Error('Shipping address not found'), { status: 404 });

          const cart = await tx.cart.findUnique({
            where: { userId },
            include: {
              items: {
                include: {
                  product: {
                    include: {
                      inventory: true,
                      variants: true,
                      images: { orderBy: { position: 'asc' } },
                    },
                  },
                },
              },
            },
          });

          // Clear server cart if requested or if custom-only order without standard items
          if (cart && (clearServerCart || (customLines?.length && (req.body as any).includeServerCart === false))) {
            await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
            cart.items = [];
          }

          const cartItems = cart?.items || [];
          if (cartItems.length === 0 && (!customLines || customLines.length === 0)) {
            throw Object.assign(new Error('Your cart is empty'), { status: 400 });
          }

          let subtotal = new Prisma.Decimal(0);

          // 1. Process standard cart items
          const standardLines = cartItems.map((item) => {
            if (!item.product.active || item.product.status === 'ARCHIVED') {
              throw Object.assign(new Error(item.product.name + ' is unavailable'), { status: 409 });
            }
            if (!item.product.inventory) {
              throw Object.assign(new Error('Inventory not configured for ' + item.product.name), { status: 409 });
            }
            const isPoster = item.product.category === 'posters' || item.product.productType === 'poster';
            let price: Prisma.Decimal;
            let option = item.variantId ? item.product.variants.find((v) => v.id === item.variantId) : undefined;

            if (isPoster) {
              if (item.variantId && item.variantId.startsWith('custom:')) {
                throw Object.assign(new Error('Arbitrary poster sizing is not supported. Please choose A5 (₹90), A4 (₹120), or A3 (₹150).'), { status: 400 });
              }
              const validSizes = ['a5', 'a4', 'a3'];
              const effectiveSize = (item.variantId && validSizes.includes(item.variantId)) ? item.variantId : 'a5';
              const canonicalPrice = effectiveSize === 'a3' ? 150 : effectiveSize === 'a4' ? 120 : 90;
              price = new Prisma.Decimal(canonicalPrice);
              option = option || ({ id: effectiveSize, label: effectiveSize.toUpperCase(), price, productId: item.productId } as any);
            } else {
              if (item.product.variants.length && !option) {
                throw Object.assign(new Error('Selected product variant is no longer available'), { status: 409 });
              }
              if (!item.product.variants.length && item.variantId) {
                throw Object.assign(new Error('Invalid product variant'), { status: 409 });
              }
              price = option?.price ?? item.product.price;
            }
            subtotal = subtotal.add(price.mul(item.quantity));

            const primaryImg = item.product.images?.find((img) => img.isPrimary) || item.product.images?.[0];

            return {
              productId: item.productId,
              variantId: option?.id ?? null,
              variantLabel: option?.label ?? null,
              nameSnapshot: item.product.name,
              unitPrice: price.toFixed(2),
              quantity: item.quantity,
              inventory: item.product.inventory,
              imageUrl: primaryImg ? primaryImg.url : null,
            };
          });

          // Atomically decrement stock and record movements for standard items
          for (const line of standardLines) {
            const changed = await tx.inventory.updateMany({
              where: { productId: line.productId, quantity: { gte: line.quantity } },
              data: { quantity: { decrement: line.quantity } },
            });
            if (changed.count !== 1) throw Object.assign(new Error('Insufficient stock for ' + line.nameSnapshot), { status: 409 });

            const updatedInv = await tx.inventory.findUniqueOrThrow({ where: { productId: line.productId } });
            await recordStockMovement(tx, {
              productId: line.productId,
              delta: -line.quantity,
              quantityAfter: updatedInv.quantity,
              reason: 'ORDER',
              actorUserId: userId,
            });
          }

          // 2. Process custom lines with server pricing and artwork ownership check
          const customOrdersToCreate: Array<{
            artworkId: string | null;
            config: any;
            previewUrl: string | null;
            productionNotes?: string | null;
            artworksToRelate: Array<{ artworkId: string; slotId?: string | null; role?: string | null }>;
          }> = [];

          const customOrderItems: Array<{
            productId: string | null;
            variantId: string | null;
            variantLabel: string | null;
            nameSnapshot: string;
            unitPrice: string;
            quantity: number;
            imageUrl: string | null;
            metadata?: any;
          }> = [];

          if (customLines && customLines.length > 0) {
            for (const line of customLines) {
              if (line.type === 'custom-sticker') {
                const art = await tx.customArtwork.findUnique({ where: { id: line.artworkId } });
                if (!art || art.userId !== userId) {
                  throw Object.assign(new Error('Custom artwork not found or not owned by you'), { status: 403 });
                }
                const unit = calculateCustomStickerUnitPrice(line.sizeId, line.finishId);
                subtotal = subtotal.add(unit.mul(line.quantity));
                const previewUrl = `/api/uploads/artwork/${line.artworkId}/file`;
                customOrdersToCreate.push({
                  artworkId: line.artworkId,
                  config: {
                    ...line,
                    artworkMeta: {
                      originalName: art.originalName,
                      mimeType: art.mimeType,
                      width: art.width,
                      height: art.height,
                    },
                  },
                  previewUrl,
                  productionNotes: line.instructions || null,
                  artworksToRelate: [{ artworkId: line.artworkId, role: 'final' }],
                });
                customOrderItems.push({
                  productId: null,
                  variantId: null,
                  variantLabel: `${line.sizeId} · ${line.finishId} · ${line.shape}`,
                  nameSnapshot: `Custom Sticker (${line.sizeId}, ${line.finishId})`,
                  unitPrice: unit.toFixed(2),
                  quantity: line.quantity,
                  imageUrl: previewUrl,
                  metadata: {
                    sizeId: line.sizeId,
                    finishId: line.finishId,
                    shape: line.shape,
                    instructions: line.instructions,
                    artworkId: line.artworkId,
                  },
                });
              } else if (line.type === 'custom-pack') {
                if (line.size !== 5 && line.size !== 10) {
                  throw Object.assign(new Error('Custom pack size must be exactly 5 or 10 stickers'), { status: 400 });
                }
                if (line.designIds.length !== line.size) {
                  throw Object.assign(
                    new Error(`A ${line.size}-sticker pack requires exactly ${line.size} chosen designs`),
                    { status: 400 }
                  );
                }
                if (new Set(line.designIds).size !== line.size) {
                  throw Object.assign(new Error('Pack designs must be distinct; duplicate designs are not allowed'), { status: 400 });
                }
                const unit = calculateCustomPackUnitPrice(line.size, line.finishId);
                subtotal = subtotal.add(unit.mul(line.quantity));

                const chosenDesigns = await tx.product.findMany({
                  where: { id: { in: line.designIds }, active: true },
                  include: { images: { orderBy: { position: 'asc' }, take: 1 } },
                });
                if (chosenDesigns.length !== line.designIds.length) {
                  throw Object.assign(new Error('One or more selected designs for the pack are unavailable or inactive'), { status: 409 });
                }

                for (const d of chosenDesigns) {
                  if (d.rarity && !['common', 'uncommon'].includes(d.rarity.toLowerCase())) {
                    throw Object.assign(new Error(`Product ${d.name} is a ${d.rarity} collectible and cannot be added to a custom pack`), { status: 400 });
                  }
                }

                const firstImg = chosenDesigns[0]?.images?.[0]?.url || null;
                const packConfig = {
                  ...line,
                  designs: chosenDesigns.map((d) => ({
                    id: d.id,
                    name: d.name,
                    rarity: d.rarity,
                    seriesId: d.seriesId,
                    imageUrl: d.images?.[0]?.url || null,
                  })),
                };

                customOrdersToCreate.push({
                  artworkId: null,
                  config: packConfig,
                  previewUrl: line.previewUrl || firstImg,
                  artworksToRelate: [],
                });
                customOrderItems.push({
                  productId: null,
                  variantId: null,
                  variantLabel: `${line.size} stickers · ${line.finishId}`,
                  nameSnapshot: `Custom Pack (${line.size} stickers)`,
                  unitPrice: unit.toFixed(2),
                  quantity: line.quantity,
                  imageUrl: firstImg,
                  metadata: packConfig,
                });
              } else if (line.type === 'custom-wall') {
                const layout = WALL_LAYOUTS[line.layoutId as keyof typeof WALL_LAYOUTS];
                if (!layout) {
                  throw Object.assign(new Error(`Unknown wall layout: ${line.layoutId}`), { status: 400 });
                }
                if (line.slots.length !== layout.slotCount) {
                  throw Object.assign(
                    new Error(`Layout ${line.layoutId} requires exactly ${layout.slotCount} slots, received ${line.slots.length}`),
                    { status: 400 }
                  );
                }
                const slotIds = new Set(line.slots.map((s) => s.slotId));
                if (slotIds.size !== layout.slotCount) {
                  throw Object.assign(new Error('Duplicate or incomplete slot IDs in custom wall'), { status: 400 });
                }

                const wallArtworksToRelate: Array<{ artworkId: string; slotId: string; role: string }> = [];
                let firstSlotImage: string | null = null;

                for (const slot of line.slots) {
                  if (slot.fill.source === 'upload') {
                    if (!slot.fill.artworkId) {
                      throw Object.assign(new Error(`Slot ${slot.slotId} is missing artwork upload`), { status: 400 });
                    }
                    const art = await tx.customArtwork.findUnique({ where: { id: slot.fill.artworkId } });
                    if (!art || art.userId !== userId) {
                      throw Object.assign(new Error(`Artwork for wall slot ${slot.slotId} not found or not owned by you`), { status: 403 });
                    }
                    wallArtworksToRelate.push({ artworkId: slot.fill.artworkId, slotId: slot.slotId, role: 'slot' });
                    if (!firstSlotImage) firstSlotImage = `/api/uploads/artwork/${slot.fill.artworkId}/file`;
                  } else if (slot.fill.source === 'catalogue') {
                    if (!slot.fill.productId) {
                      throw Object.assign(new Error(`Slot ${slot.slotId} is missing catalogue product ID`), { status: 400 });
                    }
                    const p = await tx.product.findUnique({
                      where: { id: slot.fill.productId },
                      include: { images: { orderBy: { position: 'asc' }, take: 1 } },
                    });
                    if (!p || !p.active || p.status === 'ARCHIVED') {
                      throw Object.assign(new Error(`Product in slot ${slot.slotId} is unavailable`), { status: 409 });
                    }
                    if (!firstSlotImage && p.images?.[0]) firstSlotImage = p.images[0].url;
                  }
                }

                const unit = calculateCustomWallUnitPrice(line.layoutId);
                subtotal = subtotal.add(unit.mul(line.quantity));

                customOrdersToCreate.push({
                  artworkId: null,
                  config: line,
                  previewUrl: line.previewUrl || firstSlotImage,
                  artworksToRelate: wallArtworksToRelate,
                });
                customOrderItems.push({
                  productId: null,
                  variantId: null,
                  variantLabel: line.layoutId,
                  nameSnapshot: `Custom Wall (${layout.name})`,
                  unitPrice: unit.toFixed(2),
                  quantity: line.quantity,
                  imageUrl: firstSlotImage,
                  metadata: line,
                });
              }
            }
          }

          const total = subtotal.add(deliveryFee);

          const allItemsToCreate = [
            ...standardLines.map(({ productId, variantId, variantLabel, nameSnapshot, unitPrice, quantity, imageUrl }) => ({
              productId,
              variantId,
              variantLabel,
              nameSnapshot,
              unitPrice,
              quantity,
              imageUrl,
            })),
            ...customOrderItems.map(({ productId, variantId, variantLabel, nameSnapshot, unitPrice, quantity, imageUrl, metadata }) => ({
              productId,
              variantId,
              variantLabel,
              nameSnapshot,
              unitPrice,
              quantity,
              imageUrl,
              metadata,
            })),
          ];

          const created = await tx.order.create({
            data: {
              userId,
              idempotencyKey,
              paymentMethod,
              subtotal: subtotal.toFixed(2),
              deliveryFee: deliveryFee.toFixed(2),
              total: total.toFixed(2),
              shippingAddress: {
                recipient: address.recipient,
                phone: phone || (address as any).phone || undefined,
                line1: address.line1,
                line2: address.line2,
                city: address.city,
                state: address.state,
                postalCode: address.postalCode,
              },
              items: {
                create: allItemsToCreate,
              },
              customOrders: {
                create: customOrdersToCreate.map((co) => ({
                  artworkId: co.artworkId,
                  config: co.config,
                  previewUrl: co.previewUrl,
                  productionNotes: co.productionNotes,
                  artworks: co.artworksToRelate?.length
                    ? {
                        create: co.artworksToRelate.map((a) => ({
                          artworkId: a.artworkId,
                          slotId: a.slotId || null,
                          role: a.role || 'slot',
                        })),
                      }
                    : undefined,
                })),
              },
              payment: {
                create: {
                  method: paymentMethod,
                  amount: total.toFixed(2),
                  status: 'AWAITING',
                },
              },
              events: {
                create: {
                  id: randomUUID(),
                  actorId: userId,
                  kind: 'ORDER_PLACED',
                  detail: { paymentMethod, total: total.toFixed(2) },
                },
              },
            },
            include: {
              items: true,
              customOrders: {
                include: {
                  artwork: true,
                  artworks: { include: { artwork: true } },
                },
              },
              payment: true,
            },
          });

          if (cart) {
            await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
          }

          if (phone) {
            await tx.user.update({
              where: { id: userId },
              data: { phone },
            });
          }

          // Record confirmed purchase activity for each distinct product in the order
          const distinctPurchasedProductIds = Array.from(
            new Set(created.items.map((item) => item.productId).filter((id): id is string => Boolean(id)))
          );
          for (const pId of distinctPurchasedProductIds) {
            await tx.productActivity.upsert({
              where: { productId_orderId: { productId: pId, orderId: created.id } },
              update: {},
              create: {
                productId: pId,
                type: 'PURCHASE',
                orderId: created.id,
                sessionId: null,
              },
            });
          }

          return { order: created, isReplay: false };
        },
        { isolationLevel: 'Serializable' }
      );
    });

    if (!isReplay) {
      void db.user
        .findUnique({ where: { id: userId }, select: { email: true, name: true } })
        .then((u) => {
          if (u) {
            return mailer.sendOrderConfirmationEmail({
              id: order.id,
              total: order.total.toString(),
              customerEmail: u.email,
              customerName: u.name,
              itemsCount: order.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0,
              paymentMethod: order.paymentMethod,
            });
          }
        })
        .catch((err) => logger('warn', 'Order email delivery skipped/failed', { error: String(err) }));
    }

    res.status(isReplay ? 200 : 201).json(order);
  })
);

app.post(
  '/api/orders/:id/payment/utr',
  requireAuth,
  wrap(async (req, res) => {
    const body = z
      .object({
        utr: z
          .string()
          .trim()
          .min(6, 'UTR must be at least 6 characters')
          .max(30, 'UTR must be at most 30 characters')
          .regex(/^[A-Za-z0-9_-]+$/, 'UTR contains invalid characters')
          .optional(),
        receiptUrl: z.string().trim().url().optional(),
      })
      .refine((data) => data.utr || data.receiptUrl, {
        message: 'Payment receipt image or UTR transaction reference is required',
      })
      .parse(req.body);

    const utr = body.utr ?? null;
    const receiptUrl = body.receiptUrl ?? null;
    const orderId = String(req.params.id);
    const userId = req.session!.id;

    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, userId },
        include: { payment: true },
      });
      if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });
      if (order.paymentMethod !== 'UPI') throw Object.assign(new Error('This order does not use UPI payment method'), { status: 400 });
      if (order.paymentStatus === 'PAID') throw Object.assign(new Error('This order has already been paid'), { status: 400 });

      // Reject duplicate UTR across all orders
      if (utr) {
        const existingPayment = await tx.payment.findUnique({ where: { utr } });
        if (existingPayment && existingPayment.orderId !== order.id) {
          throw Object.assign(new Error('This UTR reference has already been submitted for another order'), { status: 409 });
        }
      }

      // Update or create payment record
      const updatedPayment = await tx.payment.upsert({
        where: { orderId: order.id },
        update: {
          ...(utr ? { utr } : {}),
          ...(receiptUrl ? { receiptUrl } : {}),
          status: 'SUBMITTED',
          submittedAt: new Date(),
          rejectionReason: null,
          adminNote: null,
        },
        create: {
          orderId: order.id,
          method: 'UPI',
          amount: order.total,
          utr,
          receiptUrl,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });

      // Dual write to PaymentSubmission for backwards compatibility
      if (utr) {
        await tx.paymentSubmission.upsert({
          where: { utr },
          update: {
            status: 'SUBMITTED',
            submittedAt: new Date(),
            receiptUrl: receiptUrl ?? null,
            note: null,
          },
          create: {
            orderId: order.id,
            userId,
            utr,
            receiptUrl: receiptUrl ?? null,
            status: 'SUBMITTED',
          },
        });
      } else {
        await tx.paymentSubmission.create({
          data: {
            orderId: order.id,
            userId,
            receiptUrl: receiptUrl ?? null,
            status: 'SUBMITTED',
          },
        });
      }

      // Add order event
      await tx.orderEvent.create({
        data: {
          id: randomUUID(),
          orderId: order.id,
          actorId: userId,
          kind: 'PAYMENT_SUBMITTED',
          detail: { utr, receiptUrl, amount: order.total.toString() },
        },
      });

      // NEVER mark paymentStatus as PAID here! It must stay PENDING.
      return { orderId: order.id, payment: updatedPayment };
    });

    res.json(result);
  })
);

app.post(
  '/api/orders/:id/payment/receipt',
  requireAuth,
  (req, res, next) => {
    upload.fields([{ name: 'receipt', maxCount: 1 }, { name: 'file', maxCount: 1 }])(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ error: `File size exceeds limit of ${config.MAX_UPLOAD_SIZE_MB}MB` });
            return;
          }
          res.status(400).json({ error: err.message });
          return;
        }
        res.status(400).json({ error: err.message || 'File upload error' });
        return;
      }
      next();
    });
  },
  wrap(async (req, res) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const uploadedFile = files?.receipt?.[0] || files?.file?.[0] || (req.file as Express.Multer.File | undefined);
    if (!uploadedFile || !uploadedFile.buffer) {
      res.status(400).json({ error: 'No receipt image uploaded. Please choose a photo or screenshot.' });
      return;
    }

    const validated = await validateImageBuffer(uploadedFile.buffer, uploadedFile.originalname, uploadedFile.mimetype, true);
    const storage = getStorageDriver();
    await storage.save(validated.sanitizedBuffer, validated.fileName, validated.mimeType, true);
    const receiptUrl = await storage.getUrl(validated.fileName, true);

    const orderId = String(req.params.id);
    const userId = req.session!.id;
    const utrRaw = typeof req.body?.utr === 'string' ? req.body.utr.trim() : null;
    const utr = utrRaw && /^[A-Za-z0-9_-]{6,30}$/.test(utrRaw) ? utrRaw : null;

    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, userId },
        include: { payment: true },
      });
      if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });
      if (order.paymentMethod !== 'UPI') throw Object.assign(new Error('This order does not use UPI payment method'), { status: 400 });
      if (order.paymentStatus === 'PAID') throw Object.assign(new Error('This order has already been paid'), { status: 400 });

      if (utr) {
        const existingPayment = await tx.payment.findUnique({ where: { utr } });
        if (existingPayment && existingPayment.orderId !== order.id) {
          throw Object.assign(new Error('This UTR reference has already been submitted for another order'), { status: 409 });
        }
      }

      const updatedPayment = await tx.payment.upsert({
        where: { orderId: order.id },
        update: {
          ...(utr ? { utr } : {}),
          receiptUrl,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          rejectionReason: null,
          adminNote: null,
        },
        create: {
          orderId: order.id,
          method: 'UPI',
          amount: order.total,
          utr,
          receiptUrl,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });

      await tx.paymentSubmission.create({
        data: {
          orderId: order.id,
          userId,
          utr,
          receiptUrl,
          status: 'SUBMITTED',
        },
      });

      await tx.orderEvent.create({
        data: {
          id: randomUUID(),
          orderId: order.id,
          actorId: userId,
          kind: 'PAYMENT_RECEIPT_SUBMITTED',
          detail: { receiptUrl, utr, amount: order.total.toString() },
        },
      });

      return {
        orderId: order.id,
        payment: {
          id: updatedPayment.id,
          status: updatedPayment.status,
          utr: updatedPayment.utr,
          receiptUrl: updatedPayment.receiptUrl,
        },
      };
    });

    res.json(result);
  })
);

app.get(
  '/api/me/orders',
  requireAuth,
  wrap(async (req, res) => {
    res.json(
      await db.order.findMany({
        where: { userId: req.session!.id },
        include: {
          items: true,
          customOrders: { include: { artwork: true, artworks: { include: { artwork: true } } } },
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    );
  })
);

app.get(
  '/api/me/orders/:id',
  requireAuth,
  wrap(async (req, res) => {
    const order = await db.order.findFirst({
      where: { id: String(req.params.id), userId: req.session!.id },
      include: {
        items: true,
        customOrders: { include: { artwork: true, artworks: { include: { artwork: true } } } },
        payment: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json(order);
  })
);

app.post(
  '/api/me/orders/:id/cancel',
  requireAuth,
  wrap(async (req, res) => {
    const orderId = String(req.params.id);
    const userId = req.session!.id;
    const { reason } = z.object({ reason: z.string().trim().max(250).optional() }).parse(req.body || {});

    const updated = await withSerializableRetry(async () => {
      return db.$transaction(
        async (tx) => {
          const affected = await tx.order.updateMany({
            where: { id: orderId, userId, status: 'PENDING' },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
              cancelReason: reason || 'Cancelled by customer',
            },
          });
          if (affected.count !== 1) {
            const check = await tx.order.findFirst({ where: { id: orderId, userId } });
            if (!check) throw Object.assign(new Error('Order not found'), { status: 404 });
            throw Object.assign(
              new Error(`Only pending orders can be cancelled. Current status is ${check.status}.`),
              { status: 400 }
            );
          }

          const order = await tx.order.findUniqueOrThrow({
            where: { id: orderId },
            include: { items: true, payment: true },
          });

          // Restore stock atomically
          for (const item of order.items) {
            if (item.productId) {
              const currentInv = await tx.inventory.findUnique({ where: { productId: item.productId } });
              if (currentInv) {
                const restored = await tx.inventory.update({
                  where: { productId: item.productId },
                  data: { quantity: { increment: item.quantity } },
                });
                await recordStockMovement(tx, {
                  productId: item.productId,
                  delta: item.quantity,
                  quantityAfter: restored.quantity,
                  reason: 'CANCELLATION',
                  orderId: order.id,
                  actorUserId: userId,
                });
              }
            }
          }

          await reversePassportStamp(tx, order.id, userId, reason || 'Cancelled by customer');

          await tx.orderEvent.create({
            data: {
              id: randomUUID(),
              orderId: order.id,
              actorId: userId,
              kind: 'ORDER_CANCELLED',
              detail: { reason: reason || 'Cancelled by customer' },
            },
          });

          return order;
        },
        { isolationLevel: 'Serializable' }
      );
    });

    res.json(updated);
  })
);

app.get(
  '/api/categories',
  wrap(async (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
    const categories = await db.category.findMany({
      where: { archived: false },
      orderBy: { displayOrder: 'asc' },
    });
    res.json(categories);
  })
);

app.get(
  '/api/admin/categories',
  requireAuth,
  admin,
  wrap(async (_req, res) => {
    const categories = await db.category.findMany({
      orderBy: { displayOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    res.json(categories);
  })
);

app.post(
  '/api/admin/categories',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const input = z
      .object({
        id: z.string().min(1).regex(/^[a-z0-9-]+$/),
        name: z.string().min(1).max(100),
        blurb: z.string().max(500).optional(),
        color: z.string().max(30).optional(),
        motif: z.string().max(50).optional(),
        featured: z.boolean().default(false),
        displayOrder: z.number().int().default(0),
      })
      .parse(req.body);
    const cat = await db.category.create({ data: input });
    res.status(201).json(cat);
  })
);

app.patch(
  '/api/admin/categories/:id',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const id = String(req.params.id);
    const input = z
      .object({
        name: z.string().min(1).max(100).optional(),
        blurb: z.string().max(500).optional(),
        color: z.string().max(30).optional(),
        motif: z.string().max(50).optional(),
        featured: z.boolean().optional(),
        displayOrder: z.number().int().optional(),
        archived: z.boolean().optional(),
      })
      .parse(req.body);
    const cat = await db.category.update({ where: { id }, data: input });
    res.json(cat);
  })
);

app.get(
  '/api/products',
  wrap(async (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=180');
    const query = z
      .object({
        q: z.string().trim().max(100).optional(),
        category: z.string().max(60).optional(),
        type: z.string().max(60).optional(),
        limit: z.coerce.number().int().min(1).max(10000).optional(),
      })
      .parse(req.query);

    const rawProducts = await db.product.findMany({
      where: {
        active: true,
        status: 'PUBLISHED',
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                { slug: { contains: query.q, mode: 'insensitive' } },
                { description: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(query.category
          ? {
              OR: [
                { category: query.category },
                { categories: { some: { categoryId: query.category } } },
              ],
            }
          : {}),
        ...(query.type
          ? {
              OR: [
                { productType: query.type },
                { category: query.type },
              ],
            }
          : {}),
      },
      include: {
        images: { orderBy: { position: 'asc' } },
        inventory: true,
        categories: true,
        variants: true,
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      take: query.limit ?? undefined,
    });

    res.json(
      rawProducts.map((p) => ({
        ...p,
        collections: p.categories.map((c) => ({ collectionId: c.categoryId })),
      }))
    );
  })
);

app.get(
  '/api/products/:slug',
  wrap(async (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=180');
    const slug = String(req.params.slug);
    const product = await db.product.findFirst({
      where: { slug, active: true, status: 'PUBLISHED' },
      include: {
        images: { orderBy: { position: 'asc' } },
        inventory: true,
        categories: true,
        variants: true,
      },
    });
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json({
      ...product,
      collections: product.categories.map((c) => ({ collectionId: c.categoryId })),
    });
  })
);

app.get(
  '/api/admin/stats',
  requireAuth,
  admin,
  wrap(async (_req, res) => {
    const [customers, products, orders, pending, rev] = await Promise.all([
      db.user.count({ where: { role: 'CUSTOMER' } }),
      db.product.count(),
      db.order.count(),
      db.order.count({ where: { status: 'PENDING' } }),
      db.order.aggregate({ _sum: { total: true }, where: { status: { not: 'CANCELLED' }, paymentStatus: 'PAID' } }),
    ]);
    res.json({ customers, products, orders, pendingOrders: pending, totalRevenue: rev._sum.total?.toString() ?? '0' });
  })
);

app.get(
  '/api/admin/customers',
  requireAuth,
  admin,
  wrap(async (_req, res) => {
    res.json(
      await db.user.findMany({
        where: { role: 'CUSTOMER' },
        select: { id: true, name: true, email: true, phone: true, createdAt: true, _count: { select: { orders: true } } },
      })
    );
  })
);

app.get(
  '/api/admin/products',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const { type, category, status, q, page, limit } = z
      .object({
        type: z.enum(['ALL', 'stickers', 'posters']).default('ALL'),
        category: z.string().default('ALL'),
        status: z.enum(['ALL', 'PUBLISHED', 'HIDDEN', 'ARCHIVED']).default('ALL'),
        q: z.string().trim().default(''),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .parse(req.query);

    const where: Prisma.ProductWhereInput = {
      ...(type !== 'ALL' ? { category: type } : {}),
      ...(category !== 'ALL' ? { categories: { some: { categoryId: category } } } : {}),
      ...(status !== 'ALL' ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q, mode: 'insensitive' } },
              { id: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      db.product.count({ where }),
      db.product.findMany({
        where,
        include: {
          inventory: true,
          variants: true,
          images: { orderBy: { position: 'asc' } },
          categories: true,
        },
        orderBy: [{ displayOrder: 'asc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      total,
      page,
      limit,
      items: items.map((p) => ({
        ...p,
        collections: p.categories.map((c) => ({ collectionId: c.categoryId })),
      })),
    });
  })
);

const productVariantInput = z.object({
  id: z.string().optional().transform((s) => (s?.trim() ? s.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') : undefined)),
  label: z.string().min(1, 'Variant label is required'),
  price: z.coerce.number().nonnegative('Variant price must be non-negative'),
  detail: z.string().optional(),
});

const productImageInput = z.object({
  id: z.string().optional(),
  url: z.string().min(1, 'Image URL is required'),
  alt: z.string().default(''),
  position: z.number().int().default(0),
  isPrimary: z.boolean().default(false),
});

const productInput = z.object({
  id: z.string().optional(),
  slug: z.string().optional(),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().default(''),
  shortDescription: z.string().optional(),
  price: z.coerce.number().nonnegative('Price must be non-negative'),
  active: z.boolean().default(true),
  status: z.enum(['PUBLISHED', 'HIDDEN', 'ARCHIVED']).default('PUBLISHED'),
  productType: z.string().default('single'),
  category: z.enum(['stickers', 'posters']).default('stickers'),
  featured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
  stock: z.number().int().nonnegative().optional(),
  packQuantity: z.number().int().optional(),
  dimensions: z.string().optional(),
  material: z.string().optional(),
  finish: z.string().optional(),
  note: z.string().optional(),
  rarity: z.string().optional(),
  seriesId: z.string().optional(),
  metadata: z.any().optional(),
  variants: z.array(productVariantInput).optional(),
  images: z.array(productImageInput).optional(),
  categories: z.array(z.string().min(1)).optional(),
  collections: z.array(z.string().min(1)).optional(),
});

app.post(
  '/api/admin/products',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const { variants, images, categories, collections, stock, shortDescription, id: customId, slug: customSlug, ...p } = productInput.parse(req.body);

    const created = await db.$transaction(async (tx) => {
      // 1. Generate clean productId if not provided
      const prefix = p.category === 'posters' ? 'pst-' : 'stk-';
      let productId = (customId?.trim() || `${prefix}${crypto.randomUUID().slice(0, 8)}`).toLowerCase();
      let existingWithId = await tx.product.findUnique({ where: { id: productId }, select: { id: true } });
      if (existingWithId) {
        productId = `${prefix}${crypto.randomUUID().slice(0, 8)}`;
      }

      // 2. Generate clean slug if not provided
      let rawSlug = (customSlug || p.name).toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
      if (!rawSlug) rawSlug = `item-${crypto.randomUUID().slice(0, 6)}`;
      let existingWithSlug = await tx.product.findUnique({ where: { slug: rawSlug }, select: { id: true } });
      if (existingWithSlug) {
        rawSlug = `${rawSlug}-${crypto.randomUUID().slice(0, 4)}`;
      }

      // 3. Prepare metadata preserving shortDescription
      const meta = {
        ...(typeof p.metadata === 'object' && p.metadata !== null ? p.metadata : {}),
        ...(shortDescription ? { shortDescription } : {}),
      };

      const product = await tx.product.create({
        data: {
          ...p,
          id: productId,
          slug: rawSlug,
          metadata: Object.keys(meta).length > 0 ? meta : undefined,
          price: p.price.toFixed(2),
          active: p.status === 'PUBLISHED',
        },
      });

      if (variants?.length) {
        await tx.productVariant.createMany({
          data: variants.map((v, idx) => ({
            productId: product.id,
            id: v.id || `v${idx + 1}`,
            label: v.label,
            price: v.price.toFixed(2),
          })),
        });
      }

      if (images?.length) {
        await tx.productImage.createMany({
          data: images.map((img, idx) => ({
            productId: product.id,
            url: img.url,
            alt: img.alt || product.name,
            position: img.position ?? idx,
            isPrimary: img.isPrimary ?? idx === 0,
          })),
        });
      }

      const finalCategories = Array.from(new Set([...(categories || []), ...(collections || [])]));
      if (finalCategories.length) {
        await tx.productCategory.createMany({
          data: finalCategories.map((catId) => ({ productId: product.id, categoryId: catId })),
          skipDuplicates: true,
        });
      }

      if (stock !== undefined) {
        await tx.inventory.create({
          data: { productId: product.id, quantity: stock },
        });
        await recordStockMovement(tx, {
          productId: product.id,
          delta: stock,
          quantityAfter: stock,
          reason: 'RESTOCK',
          actorUserId: req.session!.id,
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id: product.id },
        include: { inventory: true, variants: true, images: { orderBy: { position: 'asc' } }, categories: true },
      });
    });

    res.status(201).json(created);
  })
);

app.patch(
  '/api/admin/products/:id',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const productId = String(req.params.id);
    const { variants, images, categories, collections, stock, shortDescription, slug: customSlug, ...data } = productInput.omit({ id: true }).partial().parse(req.body);

    const updated = await db.$transaction(async (tx) => {
      const current = await tx.product.findUniqueOrThrow({ where: { id: productId }, include: { inventory: true } });

      let nextSlug: string | undefined = undefined;
      if (customSlug) {
        let cleanSlug = customSlug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
        if (cleanSlug) {
          const existing = await tx.product.findUnique({ where: { slug: cleanSlug }, select: { id: true } });
          if (existing && existing.id !== productId) {
            cleanSlug = `${cleanSlug}-${crypto.randomUUID().slice(0, 4)}`;
          }
          nextSlug = cleanSlug;
        }
      }

      let nextMeta = data.metadata;
      if (shortDescription !== undefined || data.metadata !== undefined) {
        const curMeta = (typeof current.metadata === 'object' && current.metadata !== null) ? (current.metadata as Record<string, any>) : {};
        const incomingMeta = (typeof data.metadata === 'object' && data.metadata !== null) ? data.metadata : {};
        nextMeta = { ...curMeta, ...incomingMeta };
        if (shortDescription !== undefined) nextMeta.shortDescription = shortDescription;
      }

      await tx.product.update({
        where: { id: productId },
        data: {
          ...data,
          ...(nextSlug ? { slug: nextSlug } : {}),
          ...(nextMeta !== undefined ? { metadata: nextMeta } : {}),
          price: data.price === undefined ? undefined : data.price.toFixed(2),
          active: data.status ? data.status === 'PUBLISHED' : data.active,
        },
      });

      if (variants !== undefined) {
        await tx.productVariant.deleteMany({ where: { productId } });
        if (variants.length) {
          await tx.productVariant.createMany({
            data: variants.map((v, idx) => ({ productId, id: v.id || `v${idx + 1}`, label: v.label, price: v.price.toFixed(2) })),
          });
        }
      }

      if (images !== undefined) {
        await tx.productImage.deleteMany({ where: { productId } });
        if (images.length) {
          await tx.productImage.createMany({
            data: images.map((img, idx) => ({
              productId,
              url: img.url,
              alt: img.alt || current.name,
              position: img.position ?? idx,
              isPrimary: img.isPrimary ?? idx === 0,
            })),
          });
        }
      }

      const nextCats = categories !== undefined ? categories : collections;
      if (nextCats !== undefined) {
        await tx.productCategory.deleteMany({ where: { productId } });
        const finalCategories = Array.from(new Set(nextCats));
        if (finalCategories.length) {
          await tx.productCategory.createMany({
            data: finalCategories.map((catId) => ({ productId, categoryId: catId })),
            skipDuplicates: true,
          });
        }
      }

      if (stock !== undefined) {
        const prevStock = current.inventory?.quantity ?? 0;
        await tx.inventory.upsert({
          where: { productId },
          create: { productId, quantity: stock },
          update: { quantity: stock },
        });
        await recordStockMovement(tx, {
          productId,
          delta: stock - prevStock,
          quantityAfter: stock,
          reason: 'ADMIN_ADJUSTMENT',
          actorUserId: req.session!.id,
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id: productId },
        include: { inventory: true, variants: true, images: { orderBy: { position: 'asc' } }, categories: true },
      });
    });

    res.json(updated);
  })
);

app.delete(
  '/api/admin/products/:id',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const productId = String(req.params.id);
    const permanent = req.query.permanent === 'true';

    if (permanent) {
      await db.$transaction(async (tx) => {
        await tx.productCategory.deleteMany({ where: { productId } });
        await tx.productImage.deleteMany({ where: { productId } });
        await tx.productVariant.deleteMany({ where: { productId } });
        await tx.cartItem.deleteMany({ where: { productId } });
        await tx.inventoryMovement.deleteMany({ where: { productId } });
        await tx.stockChange.deleteMany({ where: { productId } });
        await tx.inventory.deleteMany({ where: { productId } });
        await tx.product.delete({ where: { id: productId } });
      });
      res.json({ success: true, deleted: productId });
    } else {
      res.json(
        await db.product.update({
          where: { id: productId },
          data: { active: false, status: 'ARCHIVED' },
        })
      );
    }
  })
);

app.post(
  '/api/admin/products/bulk-delete',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const { ids, permanent = true } = z
      .object({
        ids: z.array(z.string().min(1)).min(1),
        permanent: z.boolean().optional(),
      })
      .parse(req.body);

    let deletedCount = 0;
    let archivedCount = 0;

    for (const productId of ids) {
      const orderCount = await db.orderItem.count({ where: { productId } });
      if (orderCount > 0 || !permanent) {
        // If referenced in actual orders, safely archive so financial records and customer order history remain 100% intact
        await db.product.update({
          where: { id: productId },
          data: { active: false, status: 'ARCHIVED' },
        });
        archivedCount++;
      } else {
        await db.$transaction(async (tx) => {
          await tx.productCategory.deleteMany({ where: { productId } });
          await tx.productImage.deleteMany({ where: { productId } });
          await tx.productVariant.deleteMany({ where: { productId } });
          await tx.cartItem.deleteMany({ where: { productId } });
          await tx.inventoryMovement.deleteMany({ where: { productId } });
          await tx.stockChange.deleteMany({ where: { productId } });
          await tx.inventory.deleteMany({ where: { productId } });
          await tx.product.delete({ where: { id: productId } });
        });
        deletedCount++;
      }
    }

    res.json({ success: true, total: ids.length, deletedCount, archivedCount });
  })
);

app.put(
  '/api/admin/inventory/:productId',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const { quantity } = z.object({ quantity: z.number().int().min(0).max(1000000) }).parse(req.body);
    const productId = String(req.params.productId);
    const exists = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!exists) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const saved = await db.$transaction(async (tx) => {
      const prev = await tx.inventory.findUnique({ where: { productId } });
      const before = prev?.quantity ?? 0;
      const inv = await tx.inventory.upsert({ where: { productId }, create: { productId, quantity }, update: { quantity } });

      await recordStockMovement(tx, {
        productId,
        delta: quantity - before,
        quantityAfter: quantity,
        reason: quantity >= before ? 'RESTOCK' : 'ADMIN_ADJUSTMENT',
        actorUserId: req.session!.id,
      });

      return inv;
    });

    res.json(saved);
  })
);

// Admin bulk inventory setup for unconfigured products
app.post(
  '/api/admin/inventory/bulk-init',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const { quantity } = z.object({ quantity: z.number().int().min(0).max(1000000).default(10) }).parse(req.body);
    const unconfigured = await db.product.findMany({
      where: { inventory: null },
      select: { id: true, name: true },
    });

    const initialized = await db.$transaction(async (tx) => {
      const results = [];
      for (const p of unconfigured) {
        const inv = await tx.inventory.create({ data: { productId: p.id, quantity } });
        await recordStockMovement(tx, {
          productId: p.id,
          delta: quantity,
          quantityAfter: quantity,
          reason: 'RESTOCK',
          actorUserId: req.session!.id,
        });
        results.push({ productId: p.id, quantity: inv.quantity });
      }
      return results;
    });

    res.json({ count: initialized.length, message: `Stock initialized for ${initialized.length} products.` });
  })
);

// Admin inventory movements audit log
app.get(
  '/api/admin/inventory/movements',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const productId = req.query.productId ? String(req.query.productId) : undefined;
    const movements = await db.inventoryMovement.findMany({
      where: productId ? { productId } : {},
      include: { product: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(movements);
  })
);

app.get(
  '/api/admin/orders',
  requireAuth,
  admin,
  wrap(async (_req, res) => {
    res.json(
      await db.order.findMany({
        include: {
          items: true,
          payment: true,
          events: { orderBy: { createdAt: 'desc' } },
          user: { select: { id: true, name: true, email: true, phone: true } },
          customOrders: {
            include: {
              artwork: true,
              artworks: {
                include: {
                  artwork: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    );
  })
);

app.get(
  '/api/admin/orders/:id',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const id = String(req.params.id);
    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: true,
        payment: true,
        events: { orderBy: { createdAt: 'desc' } },
        customOrders: {
          include: {
            artwork: true,
            artworks: {
              include: {
                artwork: true,
              },
            },
          },
        },
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const auditLogs = await db.auditLog.findMany({
      where: {
        OR: [
          { entity: 'Order', entityId: order.id },
          ...(order.payment ? [{ entity: 'Payment', entityId: order.payment.id }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ ...order, auditLogs });
  })
);

app.get(
  '/api/admin/payments',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const status = req.query.status ? String(req.query.status) : undefined;
    const payments = await db.payment.findMany({
      where: status ? { status: status as any } : {},
      include: {
        order: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(payments);
  })
);

app.post(
  '/api/admin/payments/:id/verify',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const targetId = String(req.params.id);
    const adminId = req.session!.id;

    const result = await db.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { OR: [{ id: targetId }, { orderId: targetId }] },
        include: { order: true },
      });
      if (!payment) throw Object.assign(new Error('Payment record not found'), { status: 404 });
      if (payment.status === 'VERIFIED' && payment.order.paymentStatus === 'PAID') {
        return { payment, order: payment.order, message: 'Payment already verified' };
      }

      const beforePayment = { status: payment.status, utr: payment.utr, verifiedAt: payment.verifiedAt };

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
          verifiedById: adminId,
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: 'PAID',
          paidAt: new Date(),
          paymentVerifiedById: adminId,
          status: payment.order.status === 'PENDING' ? 'CONFIRMED' : payment.order.status,
        },
        include: { payment: true, items: true, user: { select: { id: true, name: true, email: true } } },
      });

      if (updatedOrder.status === 'COMPLETED') {
        await awardPassportStamp(tx, updatedOrder);
      }

      if (payment.utr) {
        await tx.paymentSubmission.updateMany({
          where: { utr: payment.utr },
          data: { status: 'VERIFIED', reviewedAt: new Date(), reviewedById: adminId },
        });
      }

      await tx.auditLog.create({
        data: {
          actor: adminId,
          action: 'PAYMENT_VERIFIED',
          entity: 'Payment',
          entityId: payment.id,
          before: beforePayment,
          after: { status: 'VERIFIED', verifiedById: adminId },
        },
      });

      await tx.orderEvent.create({
        data: {
          id: randomUUID(),
          orderId: payment.orderId,
          actorId: adminId,
          kind: 'PAYMENT_VERIFIED',
          detail: { utr: payment.utr, amount: payment.amount.toString() },
        },
      });

      return { payment: updatedPayment, order: updatedOrder };
    });

    res.json(result);
  })
);

app.post(
  '/api/admin/payments/:id/reject',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const { reason, note } = z
      .object({
        reason: z.string().trim().min(2, 'Rejection reason is required').max(250),
        note: z.string().trim().max(500).optional(),
      })
      .parse(req.body);

    const targetId = String(req.params.id);
    const adminId = req.session!.id;

    const result = await db.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { OR: [{ id: targetId }, { orderId: targetId }] },
        include: { order: true },
      });
      if (!payment) throw Object.assign(new Error('Payment record not found'), { status: 404 });
      if (payment.order.paymentStatus === 'PAID') {
        throw Object.assign(new Error('Cannot reject an order that is already marked PAID. Process a refund instead.'), { status: 400 });
      }

      const before = { status: payment.status, utr: payment.utr };

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'REJECTED',
          rejectionReason: reason,
          adminNote: note || null,
        },
      });

      if (payment.utr) {
        await tx.paymentSubmission.updateMany({
          where: { utr: payment.utr },
          data: { status: 'REJECTED', reviewedAt: new Date(), reviewedById: adminId, note: reason },
        });
      }

      await tx.auditLog.create({
        data: {
          actor: adminId,
          action: 'PAYMENT_REJECTED',
          entity: 'Payment',
          entityId: payment.id,
          before,
          after: { status: 'REJECTED', reason, note },
        },
      });

      await tx.orderEvent.create({
        data: {
          id: randomUUID(),
          orderId: payment.orderId,
          actorId: adminId,
          kind: 'PAYMENT_REJECTED',
          detail: { reason, note },
        },
      });

      return { payment: updatedPayment };
    });

    res.json(result);
  })
);

app.post(
  '/api/admin/orders/:id/cod-collected',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const orderId = String(req.params.id);
    const adminId = req.session!.id;

    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { payment: true },
      });
      if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });
      if (order.paymentMethod !== 'COD') {
        throw Object.assign(new Error('This order is not a Cash on Delivery order'), { status: 400 });
      }
      if (order.paymentStatus === 'PAID') {
        throw Object.assign(new Error('Payment for this order has already been collected'), { status: 400 });
      }

      const beforeOrder = { paymentStatus: order.paymentStatus, status: order.status };
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'PAID',
          paidAt: new Date(),
          status: 'COMPLETED',
        },
        include: { payment: true, items: true, user: { select: { id: true, name: true, email: true } } },
      });

      await awardPassportStamp(tx, updatedOrder);

      const updatedPayment = await tx.payment.upsert({
        where: { orderId },
        update: {
          status: 'COLLECTED',
          collectedAt: new Date(),
          collectedById: adminId,
        },
        create: {
          orderId,
          method: 'COD',
          amount: order.total,
          status: 'COLLECTED',
          collectedAt: new Date(),
          collectedById: adminId,
        },
      });

      await tx.auditLog.create({
        data: {
          actor: adminId,
          action: 'COD_COLLECTED',
          entity: 'Order',
          entityId: order.id,
          before: beforeOrder,
          after: { paymentStatus: 'PAID', collectedById: adminId },
        },
      });

      await tx.orderEvent.create({
        data: {
          id: randomUUID(),
          orderId: order.id,
          actorId: adminId,
          kind: 'COD_COLLECTED',
          detail: { collectedBy: adminId, amount: order.total.toString() },
        },
      });

      return { order: updatedOrder, payment: updatedPayment };
    });

    res.json(result);
  })
);

app.patch(
  '/api/admin/orders/:id',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const { status, reason } = z
      .object({
        status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED']),
        reason: z.string().max(250).optional(),
      })
      .parse(req.body);

    const transitions: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
    };
    const id = String(req.params.id);

    const updatedOrder = await withSerializableRetry(async () => {
      return db.$transaction(
        async (tx) => {
          const current = await tx.order.findUnique({
            where: { id },
            include: { items: true },
          });
          if (!current) throw Object.assign(new Error('Order not found'), { status: 404 });
          if (!transitions[current.status]?.includes(status)) {
            throw Object.assign(new Error(`Invalid order status transition from ${current.status} to ${status}`), { status: 409 });
          }

          // Shipping guard: Cannot ship unless payment is PAID or method is COD
          if ((status === 'SHIPPED' || status === 'COMPLETED') && current.paymentMethod === 'UPI' && current.paymentStatus !== 'PAID') {
            throw Object.assign(new Error('Cannot ship unpaid UPI order. Payment must be verified first.'), { status: 400 });
          }

          // Restoring stock atomically upon order cancellation
          if (status === 'CANCELLED' && current.status !== 'CANCELLED') {
            for (const item of current.items) {
              if (item.productId) {
                const currentInv = await tx.inventory.findUnique({ where: { productId: item.productId } });
                if (currentInv) {
                  const restored = await tx.inventory.update({
                    where: { productId: item.productId },
                    data: { quantity: { increment: item.quantity } },
                  });
                  await recordStockMovement(tx, {
                    productId: item.productId,
                    delta: item.quantity,
                    quantityAfter: restored.quantity,
                    reason: 'CANCELLATION',
                    orderId: id,
                    actorUserId: req.session!.id,
                  });
                }
              }
            }

            await reversePassportStamp(tx, id, req.session!.id, reason || 'Cancelled by administrator');

            if (current.paymentStatus === 'PAID') {
              await tx.auditLog.create({
                data: {
                  actor: req.session!.id,
                  action: 'ORDER_CANCELLED_AFTER_PAID',
                  entity: 'Order',
                  entityId: id,
                  before: { paymentStatus: 'PAID' },
                  after: { notice: 'Manual refund required for cancelled paid order' },
                },
              });
            }
          }

          const order = await tx.order.update({
            where: { id },
            data: {
              status,
              ...(status === 'CANCELLED'
                ? {
                    cancelledAt: new Date(),
                    cancelReason: reason || 'Cancelled by administrator',
                  }
                : {}),
            },
            include: { items: true, payment: true, user: { select: { id: true, name: true, email: true } } },
          });

          if (status === 'COMPLETED' && current.paymentStatus === 'PAID') {
            await awardPassportStamp(tx, order);
          }

          return order;
        },
        { isolationLevel: 'Serializable' }
      );
    });

    res.json(updatedOrder);
  })
);

// ==========================================
// Community & Voting API
// ==========================================

// Public active proposals
app.get(
  '/api/proposals',
  wrap(async (req, res) => {
    if (req.session?.id) {
      res.setHeader('Cache-Control', 'private, no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    }
    const proposals = await getActiveProposals(db, req.session?.id, req.session?.role === 'ADMIN');
    res.json(proposals);
  })
);

// Cast or update vote on a drop proposal
app.post(
  '/api/proposals/:id/vote',
  requireAuth,
  wrap(async (req, res) => {
    const { directionId } = z.object({ directionId: z.string().min(1) }).parse(req.body);
    const proposalId = String(req.params.id);

    const proposal = await db.dropProposal.findUnique({
      where: { id: proposalId },
      include: { directions: true },
    });
    if (!proposal) {
      res.status(404).json({ error: 'Drop proposal not found' });
      return;
    }
    if (proposal.status !== 'OPEN') {
      res.status(400).json({ error: 'Voting is closed for this drop proposal' });
      return;
    }

    const directionExists = proposal.directions.some((d) => d.id === directionId);
    if (!directionExists) {
      res.status(400).json({ error: 'Invalid direction for this proposal' });
      return;
    }

    const vote = await db.proposalVote.upsert({
      where: {
        proposalId_userId: {
          proposalId,
          userId: req.session!.id,
        },
      },
      create: {
        userId: req.session!.id,
        proposalId,
        directionId,
      },
      update: {
        directionId,
      },
    });

    res.json({ success: true, proposalId, directionId: vote.directionId });
  })
);

// Submit an idea to the community box
app.post(
  '/api/ideas',
  requireAuth,
  wrap(async (req, res) => {
    const { idea, originalConfirmed } = z
      .object({
        idea: z.string().trim().min(5, 'Idea must be at least 5 characters').max(500, 'Idea cannot exceed 500 characters'),
        originalConfirmed: z.boolean().refine((val) => val === true, 'You must confirm that this is your original suggestion'),
      })
      .parse(req.body);

    const userId = req.session!.id;

    // Rate-limit: 5 ideas per 24 hours
    const count = await db.submittedIdea.count({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (count >= 5) {
      res.status(429).json({ error: 'You have reached the maximum of 5 idea submissions per 24 hours.' });
      return;
    }

    const created = await db.submittedIdea.create({
      data: {
        userId,
        idea,
        originalConfirmed,
        status: 'PENDING',
      },
    });

    res.status(201).json({
      id: created.id,
      idea: created.idea,
      status: created.status,
      message: 'Idea received! Our curation team reviews suggestions regularly.',
    });
  })
);

// Public approved community ideas
app.get(
  '/api/ideas',
  wrap(async (_req, res) => {
    const ideas = await db.submittedIdea.findMany({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: {
        id: true,
        idea: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    });
    res.json(ideas);
  })
);

// Admin Proposals
app.get(
  '/api/admin/proposals',
  requireAuth,
  admin,
  wrap(async (_req, res) => {
    const proposals = await db.dropProposal.findMany({
      include: {
        directions: {
          include: {
            _count: { select: { votes: true } },
          },
        },
        _count: { select: { votes: true } },
      },
      orderBy: { displayOrder: 'asc' },
    });
    res.json(proposals);
  })
);

app.post(
  '/api/admin/proposals',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const body = z
      .object({
        theme: z.string().trim().min(3).max(100),
        pitch: z.string().trim().min(5).max(300),
        motif: z.string().trim().max(50).optional(),
        color: z.string().trim().max(30).optional(),
        status: z.enum(['OPEN', 'CLOSED', 'ARCHIVED']).default('OPEN'),
        resultsPublic: z.boolean().default(false),
        displayOrder: z.number().int().default(0),
        directions: z
          .array(
            z.object({
              name: z.string().trim().min(2).max(100),
              description: z.string().trim().min(5).max(300),
            })
          )
          .min(2, 'At least 2 directions are required'),
      })
      .parse(req.body);

    const id = body.theme.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || randomUUID();
    const created = await db.dropProposal.create({
      data: {
        id,
        theme: body.theme,
        pitch: body.pitch,
        motif: body.motif || 'Theme Motif',
        color: body.color || '#D90A1F',
        status: body.status,
        resultsPublic: body.resultsPublic,
        displayOrder: body.displayOrder,
        directions: {
          create: body.directions.map((d, index) => ({
            id: d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `dir-${index + 1}`,
            name: d.name,
            description: d.description,
          })),
        },
      },
      include: { directions: true },
    });

    res.status(201).json(created);
  })
);

app.patch(
  '/api/admin/proposals/:id',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const id = String(req.params.id);
    const body = z
      .object({
        theme: z.string().trim().min(3).max(100).optional(),
        pitch: z.string().trim().min(5).max(300).optional(),
        motif: z.string().trim().max(50).optional(),
        color: z.string().trim().max(30).optional(),
        status: z.enum(['OPEN', 'CLOSED', 'ARCHIVED']).optional(),
        resultsPublic: z.boolean().optional(),
        displayOrder: z.number().int().optional(),
      })
      .parse(req.body);

    const updated = await db.dropProposal.update({
      where: { id },
      data: body,
      include: { directions: true, _count: { select: { votes: true } } },
    });

    res.json(updated);
  })
);

// Admin Ideas
app.get(
  '/api/admin/ideas',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const status = req.query.status ? String(req.query.status) : undefined;
    const ideas = await db.submittedIdea.findMany({
      where: status ? { status: status as any } : {},
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(ideas);
  })
);

app.patch(
  '/api/admin/ideas/:id',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const id = String(req.params.id);
    const { status, reviewNote } = z
      .object({
        status: z.enum(['APPROVED', 'REJECTED']),
        reviewNote: z.string().trim().max(300).optional(),
      })
      .parse(req.body);

    const updated = await db.submittedIdea.update({
      where: { id },
      data: {
        status,
        reviewNote: reviewNote || null,
        reviewedAt: new Date(),
        reviewedById: req.session!.id,
      },
    });

    res.json(updated);
  })
);

// ==========================================
// Collector Passport API
// ==========================================

// Customer Passport
app.get(
  '/api/me/passport',
  requireAuth,
  wrap(async (req, res) => {
    const passport = await getCustomerPassport(db, req.session!.id);
    res.json(passport);
  })
);

// Customer Claim/Redeem Reward
app.post(
  '/api/me/passport/redeem',
  requireAuth,
  wrap(async (req, res) => {
    const userId = req.session!.id;
    const rule = await getOrCreatePassportRule(db);
    const passport = await getCustomerPassport(db, userId);

    if (passport.availableStamps < rule.stampsGoal) {
      res.status(400).json({
        error: `Insufficient stamps for reward redemption. You currently have ${passport.availableStamps} stamps, but ${rule.stampsGoal} stamps are needed.`,
      });
      return;
    }

    const redemption = await db.passportRewardRedemption.create({
      data: {
        userId,
        stampsUsed: rule.stampsGoal,
        rewardDescription: rule.rewardDescription,
        status: 'PENDING',
      },
    });

    await db.auditLog.create({
      data: {
        actor: userId,
        action: 'PASSPORT_REWARD_CLAIMED',
        entity: 'PassportRewardRedemption',
        entityId: redemption.id,
        after: { userId, stampsUsed: rule.stampsGoal, rewardDescription: rule.rewardDescription },
      },
    });

    res.status(201).json({
      redemption,
      message: 'Passport reward redemption submitted! Our team will process your physical reward with your next shipment.',
    });
  })
);

// Admin Passport Customers
app.get(
  '/api/admin/passport/customers',
  requireAuth,
  admin,
  wrap(async (_req, res) => {
    const rule = await getOrCreatePassportRule(db);
    const users = await db.user.findMany({
      where: { role: 'CUSTOMER' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        stamps: { select: { id: true, createdAt: true, type: true, orderId: true } },
        redemptions: { select: { id: true, stampsUsed: true, status: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const results = users.map((u) => {
      const totalStamps = u.stamps.length;
      const stampsUsed = u.redemptions
        .filter((r) => r.status !== 'REJECTED')
        .reduce((sum, r) => sum + r.stampsUsed, 0);
      const availableStamps = Math.max(0, totalStamps - stampsUsed);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        totalStamps,
        stampsUsed,
        availableStamps,
        canRedeem: availableStamps >= rule.stampsGoal,
        redemptionCount: u.redemptions.length,
      };
    });

    res.json(results);
  })
);

// Admin Passport Customer Detail
app.get(
  '/api/admin/passport/customers/:userId',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const passport = await getCustomerPassport(db, String(req.params.userId));
    res.json(passport);
  })
);

// Admin Manual Stamp Adjustment
app.post(
  '/api/admin/passport/stamps',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const { userId, count, reason } = z
      .object({
        userId: z.string().min(1),
        count: z.number().int().min(1).max(20),
        reason: z.string().trim().min(3, 'Reason is required for manual stamp adjustment').max(200),
      })
      .parse(req.body);

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const createdStamps = [];
    for (let i = 0; i < count; i++) {
      const stamp = await db.customerStamp.create({
        data: {
          userId,
          type: 'ADMIN_ADJUSTMENT',
          reason,
        },
      });
      createdStamps.push(stamp);
    }

    await db.auditLog.create({
      data: {
        actor: req.session!.id,
        action: 'ADMIN_STAMP_ADJUSTMENT',
        entity: 'CustomerStamp',
        entityId: createdStamps[0]?.id || userId,
        after: { userId, count, reason, adminId: req.session!.id },
      },
    });

    res.json({ success: true, count: createdStamps.length, stamps: createdStamps });
  })
);

// Admin Passport Rules
app.get(
  '/api/admin/passport/rules',
  requireAuth,
  admin,
  wrap(async (_req, res) => {
    const rule = await getOrCreatePassportRule(db);
    res.json(rule);
  })
);

app.put(
  '/api/admin/passport/rules',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const body = z
      .object({
        stampsGoal: z.number().int().min(1).max(50),
        stampRule: z.string().min(5).max(300),
        rewardDescription: z.string().min(5).max(300),
        rewardValueCap: z.number().positive().nullable().optional(),
        seriesGoal: z.boolean().default(true),
      })
      .parse(req.body);

    const updated = await db.passportRule.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        stampsGoal: body.stampsGoal,
        stampRule: body.stampRule,
        rewardDescription: body.rewardDescription,
        rewardValueCap: body.rewardValueCap ? new Prisma.Decimal(body.rewardValueCap) : null,
        seriesGoal: body.seriesGoal,
      },
      update: {
        stampsGoal: body.stampsGoal,
        stampRule: body.stampRule,
        rewardDescription: body.rewardDescription,
        rewardValueCap: body.rewardValueCap ? new Prisma.Decimal(body.rewardValueCap) : null,
        seriesGoal: body.seriesGoal,
      },
    });

    await db.auditLog.create({
      data: {
        actor: req.session!.id,
        action: 'PASSPORT_RULE_UPDATED',
        entity: 'PassportRule',
        entityId: 'default',
        after: body,
      },
    });

    res.json(updated);
  })
);

// Admin Redemptions
app.get(
  '/api/admin/passport/redemptions',
  requireAuth,
  admin,
  wrap(async (_req, res) => {
    const redemptions = await db.passportRewardRedemption.findMany({
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(redemptions);
  })
);

app.patch(
  '/api/admin/passport/redemptions/:id',
  requireAuth,
  admin,
  wrap(async (req, res) => {
    const id = String(req.params.id);
    const { status, notes } = z
      .object({
        status: z.enum(['APPROVED', 'FULFILLED', 'REJECTED']),
        notes: z.string().max(300).optional(),
      })
      .parse(req.body);

    const updated = await db.passportRewardRedemption.update({
      where: { id },
      data: {
        status,
        notes: notes || undefined,
        reviewedAt: new Date(),
        reviewedById: req.session!.id,
      },
    });

    await db.auditLog.create({
      data: {
        actor: req.session!.id,
        action: 'PASSPORT_REDEMPTION_REVIEWED',
        entity: 'PassportRewardRedemption',
        entityId: id,
        after: { status, notes, reviewedBy: req.session!.id },
      },
    });

    res.json(updated);
  })
);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) {
    const detail = err.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ');
    res.status(400).json({ error: `Invalid input: ${detail}`, issues: err.issues });
    return;
  }
  const status = typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status?: unknown }).status === 'number' ? (err as { status: number }).status : 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Server error' : err instanceof Error ? err.message : 'Request failed' });
});

app.listen(config.PORT, () => console.log('Sticker Club local API on port', config.PORT));
