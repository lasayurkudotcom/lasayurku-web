import type { MiddlewareHandler } from 'astro';
import {
  isAdminRole,
  isKasirOfflineRole,
  isKasirOnlineRole,
  parseCookieHeader,
} from './lib/posAuth';

export const onRequest: MiddlewareHandler = async (context, next) => {
  try {
    const request = context.request;
    const url = new URL(request.url);
    const pathname = url.pathname;

    const legacyPageRedirects: Array<[string, string]> = [
      ['/adminrisman/packing', '/packing'],
      ['/adminrisman/kurir', '/kurir'],
      ['/adminrisman/kasiroffline', '/kasir'],
      ['/adminrisman/kasir', '/kasir'],
      ['/adminrisman', '/administrator'],
    ];
    const legacyPageRedirect = !pathname.startsWith('/adminrisman/api')
      ? legacyPageRedirects.find(([legacyPath]) =>
          pathname === legacyPath || pathname.startsWith(`${legacyPath}/`),
        )?.[1]
      : undefined;
    if (legacyPageRedirect) {
      return context.redirect
        ? context.redirect(legacyPageRedirect)
        : new Response(null, {
            status: 302,
            headers: { Location: legacyPageRedirect },
          });
    }

    if (
      pathname === '/administrator' ||
      pathname.startsWith('/administrator/')
    ) {
      const cookies = parseCookieHeader(request.headers.get('cookie') || '');
      const token = cookies['admin_token'] || cookies['auth_token'] || cookies['user_token'] || '';
      const userRole = (cookies['admin_user_role'] || cookies['user_role'] || '').toLowerCase();

      if (!token || !isAdminRole(userRole)) {
        return context.redirect
          ? context.redirect('/login?from=admin&error=denied')
          : new Response(null, {
              status: 302,
              headers: { Location: '/login?from=admin&error=denied' },
            });
      }

      return next();
    }

    if (
      pathname === '/kasir' ||
      pathname.startsWith('/kasir/') ||
      pathname === '/kurir' ||
      pathname.startsWith('/kurir/') ||
      pathname === '/packing' ||
      pathname.startsWith('/packing/')
    ) {
      const cookies = parseCookieHeader(request.headers.get('cookie') || '');
      const token = cookies['pos_online_token'] || cookies['admin_token'] || cookies['auth_token'] || cookies['user_token'] || '';
      const userRole = (cookies['pos_online_role'] || cookies['admin_user_role'] || cookies['user_role'] || '').toLowerCase();
      const isStaffPath = pathname === '/kasir' || pathname.startsWith('/kasir/')
        ? isKasirOnlineRole(userRole) || isKasirOfflineRole(userRole) || isAdminRole(userRole)
        : pathname === '/kurir' || pathname.startsWith('/kurir/')
          ? userRole.includes('kurir') || isAdminRole(userRole)
          : userRole.includes('packing') || isAdminRole(userRole);

      if (!token || !isStaffPath) {
        return context.redirect
          ? context.redirect('/login?from=admin&error=denied')
          : new Response(null, {
              status: 302,
              headers: { Location: '/login?from=admin&error=denied' },
            });
      }

      return next();
    }

    return next();
  } catch {
    return next();
  }
};
