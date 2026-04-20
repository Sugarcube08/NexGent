import { NextResponse, NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Redirect plural root to marketplace
  if (pathname === '/agents' || pathname === '/agent') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // 2. Redirect plural agent IDs to singular agent IDs (the functional route)
  if (pathname.startsWith('/agents/')) {
    const segments = pathname.split('/');
    const id = segments[2];
    if (id) {
      return NextResponse.redirect(new URL(`/agent/${id}`, request.url));
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Allow singular /agent and /agent/[id] to pass through
  return NextResponse.next();
}

export const config = {
  matcher: ['/agent', '/agent/:path*', '/agents', '/agents/:path*'],
};
