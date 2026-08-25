export type AdminSession = {
  token: string;
  role: string;
  user_nicename?: string;
  user_email?: string;
};

export const POS_OFFLINE_TOKEN_KEY = 'pos_offline_token';
export const POS_ONLINE_TOKEN_KEY = 'pos_online_token';
export const POS_OFFLINE_ROLE_KEY = 'pos_offline_role';
export const POS_ONLINE_ROLE_KEY = 'pos_online_role';
export const POS_OFFLINE_NICENAME_KEY = 'pos_offline_nicename';
export const POS_ONLINE_NICENAME_KEY = 'pos_online_nicename';

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage quota or browser restrictions
  }
}

function removeStorage(...keys: string[]): void {
  if (typeof window === 'undefined') return;
  keys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  });
}

function setCookie(name: string, value: string, days = 30): void {
  const expires = new Date(Date.now() + days * 86400 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function clearCookie(name: string): void {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function setAdminSession(session: AdminSession): void {
  const role = session.role || 'pelanggan';
  const token = session.token || '';
  const nicename = session.user_nicename || 'Pengguna';
  const email = session.user_email || '';

  writeStorage('admin_token', token);
  writeStorage('admin_user_role', role);
  writeStorage('admin_user_nicename', nicename);
  writeStorage('admin_user_email', email);
  writeStorage('user_role', role);
  writeStorage('user_nicename', nicename);
  writeStorage('user_email', email);

  const lowered = role.toLowerCase();
  if (lowered.includes('offline') || lowered === 'kasir_offline') {
    writeStorage(POS_OFFLINE_TOKEN_KEY, token);
    writeStorage(POS_OFFLINE_ROLE_KEY, role);
    writeStorage(POS_OFFLINE_NICENAME_KEY, nicename);
  } else if (lowered.includes('kasir')) {
    writeStorage(POS_ONLINE_TOKEN_KEY, token);
    writeStorage(POS_ONLINE_ROLE_KEY, role);
    writeStorage(POS_ONLINE_NICENAME_KEY, nicename);
  }

  setCookie('admin_token', token);
  setCookie('admin_user_role', role);
  setCookie('user_role', role);
  setCookie('user_nicename', nicename);
  setCookie('auth_token', token);
}

export function setCustomerSession(session: AdminSession): void {
  const token = session.token || '';
  const nicename = session.user_nicename || 'Pengguna';
  const email = session.user_email || '';

  writeStorage('user_token', token);
  writeStorage('user_role', 'pelanggan');
  writeStorage('user_nicename', nicename);
  writeStorage('user_email', email);

  setCookie('user_token', token);
  setCookie('user_role', 'pelanggan');
  setCookie('user_nicename', nicename);
}

export function setPosAuthCookies(session: AdminSession): void {
  const role = session.role || 'pelanggan';
  const token = session.token || '';
  const nicename = session.user_nicename || 'Pengguna';

  setCookie('auth_token', token);
  setCookie('user_token', token);
  setCookie('user_role', role);
  setCookie('user_nicename', nicename);
  setCookie('admin_token', token);
  setCookie('admin_user_role', role);

  const lowered = role.toLowerCase();
  if (lowered.includes('offline') || lowered === 'kasir_offline') {
    setCookie(POS_OFFLINE_TOKEN_KEY, token);
    setCookie(POS_OFFLINE_ROLE_KEY, role);
    setCookie(POS_OFFLINE_NICENAME_KEY, nicename);
  } else if (lowered.includes('kasir')) {
    setCookie(POS_ONLINE_TOKEN_KEY, token);
    setCookie(POS_ONLINE_ROLE_KEY, role);
    setCookie(POS_ONLINE_NICENAME_KEY, nicename);
  }
}

export function clearAdminSession(role?: string): void {
  const keys = [
    'admin_token',
    'admin_user_role',
    'admin_user_nicename',
    'admin_user_email',
    'user_token',
    'user_role',
    'user_nicename',
    'user_email',
    'auth_token',
    POS_OFFLINE_TOKEN_KEY,
    POS_ONLINE_TOKEN_KEY,
    POS_OFFLINE_ROLE_KEY,
    POS_ONLINE_ROLE_KEY,
    POS_OFFLINE_NICENAME_KEY,
    POS_ONLINE_NICENAME_KEY,
  ];

  removeStorage(...keys);
  keys.forEach(clearCookie);
}

export function clearPosAuthCookies(role?: string): void {
  const keys = [
    'auth_token',
    'user_token',
    'user_role',
    'user_nicename',
    'admin_token',
    'admin_user_role',
    POS_OFFLINE_TOKEN_KEY,
    POS_ONLINE_TOKEN_KEY,
    POS_OFFLINE_ROLE_KEY,
    POS_ONLINE_ROLE_KEY,
    POS_OFFLINE_NICENAME_KEY,
    POS_ONLINE_NICENAME_KEY,
  ];

  keys.forEach(clearCookie);
  removeStorage(...keys);
}

export function getAdminSession(preferred?: 'online' | 'offline'): AdminSession | null {
  const role = preferred === 'online'
    ? readStorage(POS_ONLINE_ROLE_KEY) || readStorage('admin_user_role') || readStorage('user_role')
    : preferred === 'offline'
      ? readStorage(POS_OFFLINE_ROLE_KEY) || readStorage('admin_user_role') || readStorage('user_role')
      : readStorage('admin_user_role') || readStorage('user_role') || readStorage(POS_ONLINE_ROLE_KEY) || readStorage(POS_OFFLINE_ROLE_KEY) || null;

  if (!role) return null;

  const token = preferred === 'online'
    ? readStorage(POS_ONLINE_TOKEN_KEY) || readStorage('admin_token') || readStorage('auth_token') || readStorage('user_token')
    : preferred === 'offline'
      ? readStorage(POS_OFFLINE_TOKEN_KEY) || readStorage('admin_token') || readStorage('auth_token') || readStorage('user_token')
      : readStorage(POS_ONLINE_TOKEN_KEY)
        || readStorage(POS_OFFLINE_TOKEN_KEY)
        || readStorage('admin_token')
        || readStorage('auth_token')
        || readStorage('user_token')
        || null;

  if (!token) return null;

  return {
    token,
    role,
    user_nicename:
      readStorage('admin_user_nicename') ||
      readStorage('user_nicename') ||
      readStorage(POS_ONLINE_NICENAME_KEY) ||
      readStorage(POS_OFFLINE_NICENAME_KEY) ||
      'Pengguna',
    user_email: readStorage('admin_user_email') || readStorage('user_email') || '',
  };
}

export function roleAllowed(
  role: string | null | undefined,
  allowedRoles: Array<string | null | undefined>,
): boolean {
  if (!role) return false;

  const loweredRole = role.toLowerCase();
  if (loweredRole.includes('admin') || loweredRole.includes('administrator') || loweredRole === 'manager') {
    return true;
  }

  return (allowedRoles || []).some((allowed) => {
    if (!allowed) return false;
    const loweredAllowed = allowed.toLowerCase();
    return (
      loweredRole === loweredAllowed ||
      loweredRole.includes(loweredAllowed) ||
      loweredAllowed.includes(loweredRole)
    );
  });
}

export function getAdminRedirect(role: string | null | undefined): string {
  const lowered = (role || '').toLowerCase();
  if (lowered.includes('kurir')) return '/kurir';
  if (lowered.includes('packing')) return '/packing';
  if (lowered.includes('admin') || lowered.includes('administrator')) return '/administrator';
  if (lowered.includes('kasir')) return '/kasir';
  return '/';
}
