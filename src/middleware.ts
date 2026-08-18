import {
  getPathSessionFromCookies,
  isAdminRole,
  isKasirOfflinePath,
  isKasirOfflineRole,
  isKasirOnlinePath,
  isKasirOnlineRole,
  parseCookieHeader,
} from './lib/posAuth';

export async function onRequest(context, next) {
  try {
    const request = context.request;
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === '/kasir' || pathname.startsWith('/kasir/')) {
      const cookies = parseCookieHeader(request.headers.get('cookie') || '');
      const token = cookies['pos_online_token'] || cookies['admin_token'] || cookies['auth_token'] || cookies['user_token'] || '';
      const userRole = (cookies['pos_online_role'] || cookies['admin_user_role'] || cookies['user_role'] || '').toLowerCase();

      // Allow unauthenticated access untuk login overlay (page akan show login overlay client-side)
      // Hanya reject jika token ada tapi role salah
      if (token && !isKasirOnlineRole(userRole)) {
        return context.redirect
          ? context.redirect('/login?from=admin&error=denied')
          : new Response(null, {
              status: 302,
              headers: { Location: '/login?from=admin&error=denied' },
            });
      }

      return next();
    }

    if (!pathname.startsWith('/adminrisman')) {
      return next();
    }

    if (pathname === '/adminrisman/login' || pathname.startsWith('/adminrisman/api')) {
      return next();
    }

    const cookies = parseCookieHeader(request.headers.get('cookie') || '');
    const authHeader = request.headers.get('authorization') || '';
    const hasAuthHeader = authHeader.toLowerCase().startsWith('bearer ');

    const pathSession = getPathSessionFromCookies(pathname, cookies);
    const token =
      pathSession?.token ||
      cookies['admin_token'] ||
      cookies['auth_token'] ||
      cookies['user_token'] ||
      cookies['session'];

    if (!token && !hasAuthHeader) {
      return context.redirect
        ? context.redirect('/login?from=admin')
        : new Response(null, {
            status: 302,
            headers: { Location: '/login?from=admin' },
          });
    }

    const userRole = (pathSession?.role ||
      cookies['admin_user_role'] ||
      cookies['user_role'] ||
      cookies['role'] ||
      '').toLowerCase();

    const isAdmin = isAdminRole(userRole);
    const isKasirOffline = isKasirOfflineRole(userRole);
    const isKasirOnline = isKasirOnlineRole(userRole);
    const isPacking = userRole.includes('packing');
    const isKurir = userRole.includes('kurir');

    const deniedRedirect = context.redirect
      ? context.redirect('/login?from=admin&error=denied')
      : new Response(null, {
          status: 302,
          headers: { Location: '/login?from=admin&error=denied' },
        });

    if (isKasirOfflinePath(pathname)) {
      if (!isKasirOffline && !isAdmin) {
        return deniedRedirect;
      }
      if (isKasirOffline && !cookies['pos_offline_token'] && !isAdmin && !hasAuthHeader) {
        return deniedRedirect;
      }
    } else if (isKasirOnlinePath(pathname)) {
      if (!isKasirOnline && !isAdmin) {
        return deniedRedirect;
      }
      if (isKasirOnline && !cookies['pos_online_token'] && !isAdmin && !hasAuthHeader) {
        return deniedRedirect;
      }
    } else if (pathname.startsWith('/adminrisman/packing')) {
      if (!isPacking && !isAdmin) {
        return context.redirect
          ? context.redirect('/login?from=admin')
          : new Response(null, { status: 302, headers: { Location: '/login?from=admin' } });
      }
    } else if (pathname.startsWith('/adminrisman/kurir')) {
      if (!isKurir && !isAdmin) {
        return context.redirect
          ? context.redirect('/login?from=admin')
          : new Response(null, { status: 302, headers: { Location: '/login?from=admin' } });
      }
    } else if (pathname.startsWith('/adminrisman')) {
      if (!isAdmin) {
        if (isPacking) {
          return context.redirect
            ? context.redirect('/adminrisman/packing')
            : new Response(null, { status: 302, headers: { Location: '/adminrisman/packing' } });
        }
        if (isKurir) {
          return context.redirect
            ? context.redirect('/adminrisman/kurir')
            : new Response(null, { status: 302, headers: { Location: '/adminrisman/kurir' } });
        }
        if (isKasirOffline) {
          return context.redirect
            ? context.redirect('/adminrisman/kasiroffline')
            : new Response(null, { status: 302, headers: { Location: '/adminrisman/kasiroffline' } });
        }
        if (isKasirOnline) {
          return context.redirect
            ? context.redirect('/kasir')
            : new Response(null, { status: 302, headers: { Location: '/kasir' } });
        }
        return context.redirect
          ? context.redirect('/login?from=admin')
          : new Response(null, { status: 302, headers: { Location: '/login?from=admin' } });
      }
    }

    return next();
  } catch {
    return next();
  }
}
