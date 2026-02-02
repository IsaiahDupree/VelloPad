/**
 * Photo Analysis API (PB-024)
 * AI-powered photo quality analysis and duplicate detection
 */

import { NextRequest, NextResponse } from 'next/server';
import { selectBestPhotos } from '@/lib/ai/photo-selection';

export const runtime = 'nodejs';

/**
 * POST /api/photo-book/projects/[projectId]/analyze
 * Analyze photos for quality and duplicates
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId;
    const body = await request.json();
    const { images } = body;

    if (!images || !Array.isArray(images)) {
      return NextResponse.json({ error: 'Images array is required' }, { status: 400 });
    }

    // Run AI analysis
    const result = await selectBestPhotos(images);

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Error analyzing photos:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to analyze photos',
      },
      { status: 500 }
    );
  }
}
