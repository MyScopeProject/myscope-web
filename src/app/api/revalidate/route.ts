import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * On-demand revalidation endpoint. Called by myscope-api whenever content
 * that affects an ISR-cached page changes (event publish/approve, hero slide
 * updates, partner add/remove, etc.). Pairs with `export const revalidate`
 * on cached pages: time-based revalidation is the safety net, this is the
 * instant-freshness layer.
 *
 * Auth: header `Authorization: Bearer <REVALIDATE_SECRET>` — the backend
 * holds the secret in its env and uses it for every revalidate call.
 * Without auth this would let anyone force the cache to thrash.
 *
 * Body: { path: string } — e.g. '/' to refresh the homepage.
 *
 * Example:
 *   curl -X POST https://myscope.lk/api/revalidate \
 *     -H "Authorization: Bearer $REVALIDATE_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"path": "/"}'
 *
 * This endpoint itself must never be cached.
 */
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;

  // Misconfiguration: refuse to revalidate without a configured secret so a
  // missing env var doesn't open the door to anonymous cache busts.
  if (!secret) {
    return NextResponse.json(
      { success: false, error: 'Revalidation not configured' },
      { status: 500 },
    );
  }

  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  let body: { path?: string };
  try {
    body = (await req.json()) as { path?: string };
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  if (!body.path) {
    return NextResponse.json(
      { success: false, error: 'Provide `path`' },
      { status: 400 },
    );
  }

  revalidatePath(body.path);

  return NextResponse.json({
    success: true,
    revalidated: { path: body.path },
    now: Date.now(),
  });
}
