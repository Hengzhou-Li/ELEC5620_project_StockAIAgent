import type { NextRequest } from 'next/server';
import * as jwtAll from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export function getUserFromRequest(req: Request | NextRequest): AuthUser | null {
  // Simple and predictable header access; Request/NextRequest normalize to lowercase
  const headersAny: any = (req as any)?.headers;
  let authHeader: string | null = headersAny?.get?.('authorization') ?? null;
  if (!authHeader && headersAny) {
    // Fallbacks for non-Header objects
    if (typeof headersAny === 'object') {
      const direct = headersAny.authorization || headersAny.Authorization;
      if (typeof direct === 'string') authHeader = direct;
      if (!authHeader) {
        try {
          const h = headersAny instanceof Headers ? headersAny : new Headers(headersAny);
          authHeader = h.get('authorization') || h.get('Authorization');
        } catch {
          // ignore
        }
      }
    }
  }

  if (!authHeader) return null;
  const [scheme, token] = String(authHeader).split(' ');
  if (!token || String(scheme).toLowerCase() !== 'bearer') return null;

  try {
    const verify: any = (jwtAll as any).verify || (jwtAll as any).default?.verify;
    const decoded = verify(token, process.env.JWT_SECRET as string) as AuthUser & {
      iat: number;
      exp: number;
    };
    return { id: decoded.id, name: decoded.name, email: decoded.email };
  } catch {
    return null;
  }
}

