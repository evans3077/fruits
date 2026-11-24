import type { NextFunction, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';

export type UserRole = 'owner' | 'manager' | 'fulfilment_staff' | 'customer';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  authUser?: AuthenticatedUser;
}

async function upsertFirebaseUser(uid: string, email: string, displayName: string): Promise<AuthenticatedUser> {
  const cleanEmail = email.trim().toLowerCase();
  const bootstrapEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();

  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      const row = existing[0];
      const shouldPromote = bootstrapEmail && cleanEmail === bootstrapEmail && row.role !== 'owner';
      if (shouldPromote || (cleanEmail && row.email !== cleanEmail)) {
        const [updated] = await db
          .update(users)
          .set({
            email: cleanEmail || row.email,
            displayName: displayName || row.displayName,
            role: shouldPromote ? 'owner' : row.role,
            updatedAt: new Date(),
          })
          .where(eq(users.uid, uid))
          .returning();
        return {
          uid: updated.uid,
          email: updated.email,
          displayName: updated.displayName,
          role: updated.role as UserRole,
        };
      }
      return {
        uid: row.uid,
        email: row.email,
        displayName: row.displayName,
        role: row.role as UserRole,
      };
    }

    const assignedRole: UserRole =
      bootstrapEmail && cleanEmail === bootstrapEmail ? 'owner' : 'customer';

    const [inserted] = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        displayName,
        role: assignedRole,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: cleanEmail,
          displayName,
          updatedAt: new Date(),
        },
      })
      .returning();

    return {
      uid: inserted.uid,
      email: inserted.email,
      displayName: inserted.displayName,
      role: inserted.role as UserRole,
    };
  } catch (err) {
    throw new Error('Failed to synchronize authenticated user.', { cause: err });
  }
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }
  const token = header.slice(7).trim();
  if (!token) return next();

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.authUser = await upsertFirebaseUser(
      decoded.uid,
      decoded.email || '',
      typeof decoded.name === 'string' ? decoded.name : ''
    );
  } catch {
    // Optional auth ignores invalid/expired tokens on public routes
  }
  next();
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const token = header.slice(7).trim();
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.authUser = await upsertFirebaseUser(
      decoded.uid,
      decoded.email || '',
      typeof decoded.name === 'string' ? decoded.name : ''
    );
    return next();
  } catch (err) {
    console.error('Firebase token verification failed:', err);
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.authUser.role)) {
      return res.status(403).json({ error: 'Insufficient permissions for this action.' });
    }
    return next();
  };
}
