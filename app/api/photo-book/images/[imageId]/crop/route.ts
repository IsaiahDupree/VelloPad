/**
 * Image Crop API (PB-023)
 * Save crop/rotate data for photo book images
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

/**
 * PUT /api/photo-book/images/[imageId]/crop
 * Save crop/rotate data for an image
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { imageId: string } }
) {
  try {
    const imageId = params.imageId;
    const body = await request.json();
    const { crop } = body;

    if (!crop) {
      return NextResponse.json({ error: 'Crop data is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update image with crop data
    const { data, error } = await supabase
      .from('photo_book_images')
      .update({
        crop_data: crop,
        updated_at: new Date().toISOString(),
      })
      .eq('id', imageId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ image: data });
  } catch (error) {
    console.error('Error saving crop data:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to save crop data',
      },
      { status: 500 }
    );
  }
}
