import { NextRequest, NextResponse } from 'next/server';

/**
 * Generic Print Provider Webhook Handler
 * Feature: BS-603
 *
 * Routes webhook requests to the appropriate provider handler
 * Supports: Prodigi, Gelato, Lulu, Peecho, etc.
 */

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');

  if (!provider) {
    return NextResponse.json(
      { error: 'Provider parameter is required' },
      { status: 400 }
    );
  }

  // Route to appropriate provider handler
  switch (provider.toLowerCase()) {
    case 'prodigi':
      // Forward to Prodigi handler
      return fetch(new URL('/api/webhooks/print/prodigi', request.url).toString(), {
        method: 'POST',
        headers: request.headers,
        body: await request.text(),
      }).then(res => res);

    case 'gelato':
      return NextResponse.json(
        { error: 'Gelato webhook handler not implemented' },
        { status: 501 }
      );

    case 'lulu':
      return NextResponse.json(
        { error: 'Lulu webhook handler not implemented' },
        { status: 501 }
      );

    case 'peecho':
      return NextResponse.json(
        { error: 'Peecho webhook handler not implemented' },
        { status: 501 }
      );

    default:
      return NextResponse.json(
        { error: `Unknown provider: ${provider}` },
        { status: 400 }
      );
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint
  return NextResponse.json({
    service: 'VelloPad Print Webhooks',
    version: '1.0',
    providers: [
      { name: 'prodigi', status: 'active' },
      { name: 'gelato', status: 'not_implemented' },
      { name: 'lulu', status: 'not_implemented' },
      { name: 'peecho', status: 'not_implemented' },
    ],
  });
}
