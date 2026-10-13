import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ITokenPayload, IWorkspaceContext, IResolvedBranding, DIDM_PLATFORM_BRANDING, IExternalResourceContent } from '@edtech/types';


// Password Security & Hashing Utilities
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// SHA-256 Token Hashing Utility
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// JWT Access & Refresh Token Utilities
const DEFAULT_JWT_SECRET = 'super-secret-jwt-key-placeholder';
const DEFAULT_REFRESH_SECRET = 'super-secret-refresh-key-placeholder';

export function signAccessToken(
  payload: Omit<ITokenPayload, 'iat' | 'exp'>,
  secret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  expiresIn = '15m'
): string {
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
}

export function verifyAccessToken(
  token: string,
  secret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET
): ITokenPayload | null {
  try {
    return jwt.verify(token, secret) as ITokenPayload;
  } catch {
    return null;
  }
}

export function signRefreshToken(
  payload: { sessionId: string; userId: string; tokenVersion: number },
  secret = process.env.JWT_REFRESH_SECRET || DEFAULT_REFRESH_SECRET,
  expiresIn = '7d'
): string {
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
}

export function verifyRefreshToken(
  token: string,
  secret = process.env.JWT_REFRESH_SECRET || DEFAULT_REFRESH_SECRET
): { sessionId: string; userId: string; tokenVersion: number } | null {
  try {
    return jwt.verify(token, secret) as any;
  } catch {
    return null;
  }
}

// Isomorphic AsyncLocalStorage for Workspace Context Execution Scope
let NodeAsyncLocalStorage: any;
if (typeof window === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    NodeAsyncLocalStorage = require('async_hooks').AsyncLocalStorage;
  } catch {
    // Fallback if environment lacks async_hooks
  }
}

class DummyAsyncLocalStorage<T> {
  getStore(): T | undefined {
    return undefined;
  }
  run<R>(_store: T, callback: () => R): R {
    return callback();
  }
}

export const tenantContextStorage = NodeAsyncLocalStorage
  ? new NodeAsyncLocalStorage()
  : new DummyAsyncLocalStorage<IWorkspaceContext>();

export function getWorkspaceContext(): IWorkspaceContext {
  const store = tenantContextStorage.getStore();
  if (!store) {
    throw new Error('Workspace context missing from execution scope.');
  }
  return store;
}

export function tryGetWorkspaceContext(): IWorkspaceContext | undefined {
  return tenantContextStorage.getStore();
}

// Backward-Compatible Aliases for Workspace Context
export const getTenantContext = getWorkspaceContext;
export const tryGetTenantContext = tryGetWorkspaceContext;

// Centralized Branding Resolver
export function resolveBranding(tenant?: any | null): IResolvedBranding {
  const isWhiteLabelActive = Boolean(tenant?.whiteLabel?.enabled);

  if (!isWhiteLabelActive) {
    return {
      isWhiteLabel: false,
      companyName: DIDM_PLATFORM_BRANDING.companyName,
      logoUrl: DIDM_PLATFORM_BRANDING.logoUrl,
      faviconUrl: DIDM_PLATFORM_BRANDING.faviconUrl,
      primaryColor: DIDM_PLATFORM_BRANDING.primaryColor,
      secondaryColor: DIDM_PLATFORM_BRANDING.secondaryColor,
      backgroundColor: DIDM_PLATFORM_BRANDING.backgroundColor,
      textColor: DIDM_PLATFORM_BRANDING.textColor,
      accentColor: DIDM_PLATFORM_BRANDING.accentColor,
      borderColor: DIDM_PLATFORM_BRANDING.borderColor,
      platformName: DIDM_PLATFORM_BRANDING.platformName,
      showPlatformBranding: true
    };
  }

  return {
    isWhiteLabel: true,
    companyName: tenant?.branding?.companyName || tenant?.name || DIDM_PLATFORM_BRANDING.companyName,
    logoUrl: tenant?.branding?.logoUrl || DIDM_PLATFORM_BRANDING.logoUrl,
    faviconUrl: tenant?.branding?.faviconUrl || DIDM_PLATFORM_BRANDING.faviconUrl,
    primaryColor: tenant?.branding?.primaryColor || DIDM_PLATFORM_BRANDING.primaryColor,
    secondaryColor: tenant?.branding?.secondaryColor || DIDM_PLATFORM_BRANDING.secondaryColor,
    backgroundColor: tenant?.branding?.theme?.backgroundColor || DIDM_PLATFORM_BRANDING.backgroundColor,
    textColor: tenant?.branding?.theme?.textColor || DIDM_PLATFORM_BRANDING.textColor,
    accentColor: tenant?.branding?.theme?.accentColor || tenant?.branding?.primaryColor || DIDM_PLATFORM_BRANDING.accentColor,
    borderColor: tenant?.branding?.theme?.borderColor || DIDM_PLATFORM_BRANDING.borderColor,
    platformName: DIDM_PLATFORM_BRANDING.platformName,
    showPlatformBranding: tenant?.branding?.showPlatformBranding ?? true
  };
}

// Slugify Helper
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// Sensitive Field Masking & Security Sanitizer
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization', 'cookie', 'creditcard', 'cvv'];

export function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeData);
  
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// Centralized Role-Based Dashboard Navigation Resolver
export function getDashboardRoute(user: any): string {
  if (!user) return '/login';

  if (user.isSuperAdmin) {
    return '/admin';
  }

  const roles = (user.roles || []).map((r: any) => (typeof r === 'string' ? r.toLowerCase() : (r.slug || r.name || '').toLowerCase()));

  if (roles.some((r: string) => r.includes('student'))) {
    return '/student';
  }

  if (roles.some((r: string) => r.includes('instructor') || r.includes('trainer') || r.includes('faculty'))) {
    return '/instructor';
  }

  if (roles.some((r: string) => r.includes('super') || r.includes('admin'))) {
    return '/admin';
  }

  // Permission fallback
  const perms = user.permissions || [];
  if (perms.includes('student.own.lifecycle.view') || perms.includes('certificate.own.view')) {
    return '/student';
  }
  if (perms.includes('assessment.grade') || perms.includes('attendance.mark')) {
    return '/instructor';
  }

  return '/admin';
}

// Validates and Sanitizes Redirect URLs
export function sanitizeRedirectUrl(redirectUrl: string | null | undefined, defaultFallback = '/admin'): string {
  if (!redirectUrl || typeof redirectUrl !== 'string') {
    return defaultFallback;
  }

  const trimmed = redirectUrl.trim();

  // Disallow absolute protocol URLs (https://, http://, //evil.com, etc.)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
    return defaultFallback;
  }

  // Ensure relative path starts with '/' and contains valid internal paths
  if (trimmed.startsWith('/') && !trimmed.startsWith('/\\')) {
    return trimmed;
  }

  return defaultFallback;
}

// Basic HTML Sanitizer Utility (Removes dangerous tags and inline script handlers)
export function sanitizeHtml(html: string | undefined | null): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:[^"']*/gi, '');
}

// Structured Production Logger Utility
export const logger = {
  info: (message: string, meta?: any) => {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', message, ...(meta ? { meta: sanitizeData(meta) } : {}) }));
  },
  warn: (message: string, meta?: any) => {
    console.warn(JSON.stringify({ timestamp: new Date().toISOString(), level: 'warn', message, ...(meta ? { meta: sanitizeData(meta) } : {}) }));
  },
  error: (message: string, error?: any, meta?: any) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      ...(error ? { error: error instanceof Error ? { name: error.name, message: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined } : error } : {}),
      ...(meta ? { meta: sanitizeData(meta) } : {})
    }));
  }
};

// Smart External Resource Parsing & Video Platform Extraction Utilities
export function extractYouTubeVideoId(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1. https://youtu.be/VIDEO_ID
  const shortMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (shortMatch && shortMatch[1]) return shortMatch[1];

  // 2. https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.|music\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) return watchMatch[1];

  // 3. https://www.youtube.com/embed/VIDEO_ID
  const embedMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch && embedMatch[1]) return embedMatch[1];

  // 4. https://www.youtube.com/shorts/VIDEO_ID
  const shortsMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

  return null;
}

export function extractVimeoVideoId(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/i);
  return match && match[1] ? match[1] : null;
}

export function parseExternalResource(url: string | undefined | null): IExternalResourceContent {
  const rawUrl = (url || '').trim();
  if (!rawUrl) {
    return {
      url: '',
      provider: 'OTHER',
      openInNewTab: true
    };
  }

  // Check YouTube
  const ytId = extractYouTubeVideoId(rawUrl);
  if (ytId) {
    return {
      url: rawUrl,
      provider: 'YOUTUBE',
      videoId: ytId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      openInNewTab: true
    };
  }

  // Check Vimeo
  const vimeoId = extractVimeoVideoId(rawUrl);
  if (vimeoId) {
    return {
      url: rawUrl,
      provider: 'VIMEO',
      videoId: vimeoId,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      openInNewTab: true
    };
  }

  return {
    url: rawUrl,
    provider: 'WEBSITE',
    openInNewTab: true
  };
}

/**
 * Normalizes a phone number for deterministic, concurrency-safe CRM deduplication.
 * Strips formatting, spaces, dashes, and standardizes standard 10-digit/12-digit Indian/International numbers.
 */
export function normalizePhone(rawPhone: string | undefined | null): string {
  if (!rawPhone) return '';
  // Remove all non-digits except a leading '+'
  const cleaned = rawPhone.trim().replace(/[^\d+]/g, '');
  if (!cleaned) return '';

  // If it starts with +91, keep 91 + 10 digits
  if (cleaned.startsWith('+91')) {
    return cleaned.slice(1);
  }
  // If it starts with 91 and has 12 digits, return 91 + 10 digits
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned;
  }
  // If 10 digits, prefix default country code 91 for uniform deduplication
  if (cleaned.length === 10 && /^\d{10}$/.test(cleaned)) {
    return `91${cleaned}`;
  }
  // If starts with 0 and has 11 digits (e.g. 09876543210), strip 0 and add 91
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `91${cleaned.slice(1)}`;
  }

  // Fallback: strip leading '+' and return digits
  return cleaned.replace(/^\+/, '');
}

/**
 * Normalizes an email address deterministically.
 */
export function normalizeEmail(rawEmail: string | undefined | null): string {
  if (!rawEmail) return '';
  return rawEmail.trim().toLowerCase();
}

/**
 * Converts a major unit currency amount (e.g. ₹4,999.00) to integer minor units (paise/cents).
 * Guarantees integer arithmetic without floating-point drift.
 */
export function toMinorUnits(amountMajor: number | string): number {
  if (typeof amountMajor === 'string') {
    const parsed = parseFloat(amountMajor);
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
  }
  return Math.round(amountMajor * 100);
}

/**
 * Converts integer minor units (e.g. 499900 paise) to major unit number (4999).
 */
export function fromMinorUnits(amountMinor: number): number {
  return (amountMinor || 0) / 100;
}

/**
 * Formats integer minor units to locale currency display string (e.g., "₹4,999.00").
 */
export function formatCurrency(
  amountMinor: number,
  currency = 'INR',
  locale = 'en-IN'
): string {
  const majorValue = fromMinorUnits(amountMinor);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(majorValue);
  } catch {
    return `${currency.toUpperCase()} ${majorValue.toFixed(2)}`;
  }
}

/**
 * Computes percentage discount strictly in integer minor units with standard round-half-up math.
 */
export function calculatePercentageDiscount(
  baseAmountMinor: number,
  percentage: number
): number {
  if (!percentage || percentage <= 0) return 0;
  if (percentage >= 100) return baseAmountMinor;
  return Math.round((baseAmountMinor * percentage) / 100);
}

/**
 * Formats a date string or Date object into human-readable format.
 */
export function formatDate(
  date: string | Date | number | undefined | null,
  options?: Intl.DateTimeFormatOptions,
  locale = 'en-US'
): string {
  if (!date) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, options || { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
}

export function formatDateTime(
  date: string | Date | number | undefined | null,
  locale = 'en-US'
): string {
  if (!date) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
}

export function formatTimeOnly(
  date: string | Date | number | undefined | null,
  locale = 'en-US'
): string {
  if (!date) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
}
