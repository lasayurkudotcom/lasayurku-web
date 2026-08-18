import {
  isKasirOfflineRole,
  isKasirOnlineRole,
} from './posAuth';

export const ADMIN_TOKEN_KEY = 'admin_token';
export const POS_OFFLINE_TOKEN_KEY = 'pos_offline_token';
export const POS_ONLINE_TOKEN_KEY = 'pos_online_token';
export const POS_OFFLINE_ROLE_KEY = 'pos_offline_role';
export const POS_ONLINE_ROLE_KEY = 'pos_online_role';
export const POS_OFFLINE_NICENAME_KEY = 'pos_offline_nicename';
export const POS_ONLINE_NICENAME_KEY = 'pos_online_nicename';
export const ADMIN_ROLE_KEY = 'admin_user_role';

export const ADMIN_NICENAME_KEY = 'admin_user_nicename';
export const ADMIN_EMAIL_KEY = 'admin_user_email';

export type AdminRole = 'kasir_offline' | 'kasir' | 'kasir_lasayurku' | 'packing_lasayurku' | 'kurir_lasayurku' | 'administrator' | string;

export type PosLoginKind = 'offline' | 'online' | 'staff';

export interface AdminSession {
  token: string;
  role: AdminRole;
  user_nicename: string;
  user_email: string;
}

function tokenKeyForRole(role: string): string {
  if (isKasirOfflineRole(role)) return POS_OFFLINE_TOKEN_KEY;
  if (isKasirOnlineRole(role)) return POS_ONLINE_TOKEN_KEY;
  return ADMIN_TOKEN_KEY;
}

function loginKindForRole(role: string): PosLoginKind {
  if (isKasirOfflineRole(role)) return 'offline';
  if (isKasirOnlineRole(role)) return 'online';
  return 'staff';
}

/** Baca session aktif (prioritas role di localStorage) atau session POS spesifik */
export function getAdminSession(preferred?: PosLoginKind): AdminSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (preferred === 'offline') {
    const token = window.localStorage.getItem(POS_OFFLINE_TOKEN_KEY);
    const role = window.localStorage.getItem(POS_OFFLINE_ROLE_KEY) || 'kasir_offline';
    const user_nicename = window.localStorage.getItem(POS_OFFLINE_NICENAME_KEY) || '';
    const user_email = window.localStorage.getItem(ADMIN_EMAIL_KEY) || '';
    if (!token) return null;
    return { token, role, user_nicename, user_email };
  }

  if (preferred === 'online') {
    const token = window.localStorage.getItem(POS_ONLINE_TOKEN_KEY);
    const role = window.localStorage.getItem(POS_ONLINE_ROLE_KEY) || 'kasir';
    const user_nicename = window.localStorage.getItem(POS_ONLINE_NICENAME_KEY) || '';
    const user_email = window.localStorage.getItem(ADMIN_EMAIL_KEY) || '';
    if (!token) return null;
    return { token, role, user_nicename, user_email };
  }

  const role = window.localStorage.getItem(ADMIN_ROLE_KEY) || window.localStorage.getItem('user_role');
  const tokenKey = role ? tokenKeyForRole(role) : ADMIN_TOKEN_KEY;
  const token =
    window.localStorage.getItem(tokenKey) ||
    window.localStorage.getItem(ADMIN_TOKEN_KEY);
  const user_nicename = window.localStorage.getItem(ADMIN_NICENAME_KEY) || '';
  const user_email = window.localStorage.getItem(ADMIN_EMAIL_KEY) || '';

  if (!token || !role) {
    return null;
  }

  return {
    token,
    role: role as AdminRole,
    user_nicename,
    user_email,
  };
}

export function setAdminSession(session: AdminSession) {
  if (typeof window === 'undefined') {
    return;
  }

  const kind = loginKindForRole(session.role);

  if (kind === 'offline') {
    window.localStorage.setItem(POS_OFFLINE_TOKEN_KEY, session.token);
    window.localStorage.setItem(POS_OFFLINE_ROLE_KEY, session.role);
    window.localStorage.setItem(POS_OFFLINE_NICENAME_KEY, session.user_nicename);
  } else if (kind === 'online') {
    window.localStorage.setItem(POS_ONLINE_TOKEN_KEY, session.token);
    window.localStorage.setItem(POS_ONLINE_ROLE_KEY, session.role);
    window.localStorage.setItem(POS_ONLINE_NICENAME_KEY, session.user_nicename);
  } else {
    window.localStorage.setItem(ADMIN_ROLE_KEY, session.role);
    window.localStorage.setItem('user_role', session.role);
    window.localStorage.setItem(ADMIN_NICENAME_KEY, session.user_nicename);
    window.localStorage.setItem('user_nicename', session.user_nicename);
    window.localStorage.setItem(ADMIN_EMAIL_KEY, session.user_email);
    window.localStorage.setItem('user_email', session.user_email);
    window.localStorage.setItem(ADMIN_TOKEN_KEY, session.token);
    window.localStorage.setItem('auth_token', session.token);
    window.localStorage.setItem('user_token', session.token);
  }
}

export function setPosAuthCookies(session: AdminSession, maxAge = 86400) {
  if (typeof document === 'undefined') return;
  const kind = loginKindForRole(session.role);
  const enc = encodeURIComponent;

  if (kind === 'offline') {
    document.cookie = `${POS_OFFLINE_TOKEN_KEY}=${enc(session.token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `${POS_OFFLINE_ROLE_KEY}=${enc(session.role)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `${POS_OFFLINE_NICENAME_KEY}=${enc(session.user_nicename)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } else if (kind === 'online') {
    document.cookie = `${POS_ONLINE_TOKEN_KEY}=${enc(session.token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `${POS_ONLINE_ROLE_KEY}=${enc(session.role)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `${POS_ONLINE_NICENAME_KEY}=${enc(session.user_nicename)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } else {
    document.cookie = `admin_user_role=${enc(session.role)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `user_role=${enc(session.role)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `admin_token=${enc(session.token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `auth_token=${enc(session.token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `user_token=${enc(session.token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
}

export function clearAdminSession(role?: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const clearAllPos = !role;

  if (clearAllPos || isKasirOfflineRole(role)) {
    window.localStorage.removeItem(POS_OFFLINE_TOKEN_KEY);
    window.localStorage.removeItem(POS_OFFLINE_ROLE_KEY);
    window.localStorage.removeItem(POS_OFFLINE_NICENAME_KEY);
  }
  if (clearAllPos || isKasirOnlineRole(role)) {
    window.localStorage.removeItem(POS_ONLINE_TOKEN_KEY);
    window.localStorage.removeItem(POS_ONLINE_ROLE_KEY);
    window.localStorage.removeItem(POS_ONLINE_NICENAME_KEY);
  }
  if (clearAllPos || (!isKasirOfflineRole(role) && !isKasirOnlineRole(role || ''))) {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    window.localStorage.removeItem('auth_token');
    window.localStorage.removeItem('user_token');
  }

  window.localStorage.removeItem(ADMIN_ROLE_KEY);
  window.localStorage.removeItem('user_role');
  window.localStorage.removeItem(ADMIN_NICENAME_KEY);
  window.localStorage.removeItem(ADMIN_EMAIL_KEY);
  window.localStorage.removeItem('user_nicename');
  window.localStorage.removeItem('user_email');
}

export function clearPosAuthCookies(role?: string) {
  if (typeof document === 'undefined') return;
  const expire = 'expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  const clearAll = !role;

  if (clearAll || isKasirOfflineRole(role)) {
    document.cookie = `${POS_OFFLINE_TOKEN_KEY}=; ${expire}`;
    document.cookie = `${POS_OFFLINE_ROLE_KEY}=; ${expire}`;
    document.cookie = `${POS_OFFLINE_NICENAME_KEY}=; ${expire}`;
  }
  if (clearAll || isKasirOnlineRole(role)) {
    document.cookie = `${POS_ONLINE_TOKEN_KEY}=; ${expire}`;
    document.cookie = `${POS_ONLINE_ROLE_KEY}=; ${expire}`;
    document.cookie = `${POS_ONLINE_NICENAME_KEY}=; ${expire}`;
  }
  if (clearAll) {
    document.cookie = `auth_token=; ${expire}`;
    document.cookie = `user_token=; ${expire}`;
    document.cookie = `admin_token=; ${expire}`;
    document.cookie = `user_role=; ${expire}`;
    document.cookie = `admin_user_role=; ${expire}`;
  }
}

export function normalizeAdminRole(roles: string[] | string | undefined | null): string {
  const candidates = Array.isArray(roles) ? roles : typeof roles === 'string' ? [roles] : [];
  if (!candidates.length) return 'pelanggan';

  for (const r of candidates) {
    if (!r) continue;
    const lowered = r.toString().toLowerCase();
    if (lowered.includes('kurir')) return 'kurir_lasayurku';
    if (lowered.includes('packing')) return 'packing_lasayurku';
    if (isKasirOfflineRole(lowered)) return 'kasir_offline';
    if (lowered.includes('kasir')) return 'kasir';
    if (lowered.includes('admin')) return 'administrator';
  }
  return 'pelanggan';
}

export function getAdminRedirect(role: string | null | undefined): string {
  if (!role) return '/login';
  const lowered = role.toString().toLowerCase();
  if (lowered.includes('kurir')) return '/adminrisman/kurir';
  if (lowered.includes('packing')) return '/adminrisman/packing';
  if (isKasirOfflineRole(lowered)) return '/kasir';
  if (isKasirOnlineRole(lowered)) return '/kasir';
  if (lowered.includes('admin')) return '/adminrisman';
  return '/login';
}

export function roleAllowed(role: string | null | undefined, allowedRoles: string[]) {
  if (!role) return false;
  const loweredRole = role.toString().toLowerCase();
  if (loweredRole.includes('admin') || loweredRole.includes('administrator')) return true;

  if (isKasirOfflineRole(loweredRole)) {
    return allowedRoles.some((a) => isKasirOfflineRole(a));
  }
  if (isKasirOnlineRole(loweredRole)) {
    return allowedRoles.some((a) => isKasirOnlineRole(a) && !isKasirOfflineRole(a));
  }

  return allowedRoles.some((allowed) => {
    const loweredAllowed = allowed.toLowerCase();
    if (loweredRole.includes('packing') && loweredAllowed.includes('packing')) return true;
    if (loweredRole.includes('kurir') && loweredAllowed.includes('kurir')) return true;
    return loweredRole === loweredAllowed;
  });
}
