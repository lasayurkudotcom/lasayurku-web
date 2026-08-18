/** Role & session helpers shared by middleware and client auth */

export const POS_OFFLINE_TOKEN_KEY = 'pos_offline_token';
export const POS_ONLINE_TOKEN_KEY = 'pos_online_token';
export const POS_OFFLINE_ROLE_KEY = 'pos_offline_role';
export const POS_ONLINE_ROLE_KEY = 'pos_online_role';
export const POS_OFFLINE_NICENAME_KEY = 'pos_offline_nicename';
export const POS_ONLINE_NICENAME_KEY = 'pos_online_nicename';

export function parseCookieHeader(cookieHeader: string): Record<string, string> {
  return cookieHeader
    .split(';')
    .map((c) => c.trim())
    .filter(Boolean)
    .reduce(
      (acc, cur) => {
        const [k, ...v] = cur.split('=');
        acc[k] = decodeURIComponent(v.join('='));
        return acc;
      },
      {} as Record<string, string>,
    );
}

export function isKasirOfflineRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const l = role.toLowerCase();
  return (
    l === 'kasir_offline' ||
    l.includes('kasiroffline') ||
    (l.includes('kasir') && l.includes('offline'))
  );
}

export function isKasirOnlineRole(role: string | null | undefined): boolean {
  if (!role) return false;
  if (isKasirOfflineRole(role)) return false;
  const l = role.toLowerCase();
  return l === 'kasir' || l === 'kasir_lasayurku' || l.includes('kasir');
}

export function isAdminRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const l = role.toLowerCase();
  return l.includes('admin') || l.includes('administrator') || l === 'manager';
}

export function isKasirOnlinePath(pathname: string): boolean {
  return (
    (pathname === '/kasir' || pathname.startsWith('/kasir/')) ||
    (pathname.startsWith('/adminrisman/kasir') &&
      !pathname.startsWith('/adminrisman/kasiroffline'))
  );
}

export function isKasirOfflinePath(pathname: string): boolean {
  return pathname.startsWith('/adminrisman/kasiroffline');
}

export function resolveRoleFromLoginHints(
  roleStr: string,
  username: string,
): 'kasir_offline' | 'kasir' | 'kurir' | 'packing' | 'administrator' | 'pelanggan' {
  const roleLower = roleStr.toLowerCase().trim();
  const usernameLower = username.toLowerCase();

  if (roleLower.includes('kurir') || usernameLower.includes('kurir')) return 'kurir';
  if (roleLower.includes('packing') || usernameLower.includes('packing')) return 'packing';
  if (
    roleLower.includes('kasir_offline') ||
    usernameLower.includes('kasiroffline') ||
    (roleLower.includes('offline') && roleLower.includes('kasir'))
  ) {
    return 'kasir_offline';
  }
  if (roleLower.includes('kasir') || usernameLower.includes('kasir')) return 'kasir';
  if (
    roleLower.includes('admin') ||
    roleLower.includes('manager') ||
    usernameLower.includes('admin') ||
    usernameLower === 'risman'
  ) {
    return 'administrator';
  }
  return 'pelanggan';
}

export function getPathSessionFromCookies(
  pathname: string,
  cookies: Record<string, string>,
): { token: string; role: string } | null {
  const authHeaderRole = (
    cookies['admin_user_role'] ||
    cookies['user_role'] ||
    cookies['role'] ||
    ''
  ).toLowerCase();

  if (isKasirOfflinePath(pathname)) {
    const role = cookies[POS_OFFLINE_ROLE_KEY] || cookies['admin_user_role'] || cookies['user_role'] || '';
    const token =
      cookies[POS_OFFLINE_TOKEN_KEY] ||
      (isKasirOfflineRole(role) ? cookies['admin_token'] || cookies['auth_token'] : '') ||
      cookies['auth_token'] ||
      cookies['user_token'] ||
      '';
    if (!token) return null;
    return { token, role: role.toLowerCase() };
  }

  if (isKasirOnlinePath(pathname)) {
    const role = cookies[POS_ONLINE_ROLE_KEY] || cookies['admin_user_role'] || cookies['user_role'] || '';
    const token =
      cookies[POS_ONLINE_TOKEN_KEY] ||
      (isKasirOnlineRole(role) && !isKasirOfflineRole(role)
        ? cookies['admin_token'] || cookies['auth_token']
        : '') ||
      cookies['auth_token'] ||
      cookies['user_token'] ||
      '';
    if (!token) return null;
    return { token, role: role.toLowerCase() };
  }

  const token =
    cookies['admin_token'] ||
    cookies['auth_token'] ||
    cookies['user_token'] ||
    cookies['session'] ||
    '';
  if (!token) return null;
  return { token, role: authHeaderRole };
}
