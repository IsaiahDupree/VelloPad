/**
 * Auto-Caption Generation Service
 * Feature: PB-008
 *
 * Generate captions from EXIF metadata (date, location)
 */

import { format } from 'date-fns';

export interface PhotoMetadata {
  dateTaken?: Date | string;
  location?: string;
  lat?: number;
  long?: number;
  cameraMake?: string;
  cameraModel?: string;
  focalLength?: number;
  aperture?: number;
  iso?: number;
  shutterSpeed?: string;
}

export interface CaptionOptions {
  includeDate?: boolean;
  includeLocation?: boolean;
  includeCamera?: boolean;
  dateFormat?: string;
  template?: 'simple' | 'detailed' | 'minimal' | 'custom';
  customTemplate?: string;
}

/**
 * Generate caption from photo EXIF metadata
 */
export function generateCaption(
  metadata: PhotoMetadata,
  options: CaptionOptions = {}
): string {
  const {
    includeDate = true,
    includeLocation = true,
    includeCamera = false,
    dateFormat = 'MMMM d, yyyy',
    template = 'simple',
    customTemplate,
  } = options;

  const parts: string[] = [];

  // Add date
  if (includeDate && metadata.dateTaken) {
    const date =
      typeof metadata.dateTaken === 'string'
        ? new Date(metadata.dateTaken)
        : metadata.dateTaken;

    if (!isNaN(date.getTime())) {
      parts.push(format(date, dateFormat));
    }
  }

  // Add location
  if (includeLocation && metadata.location) {
    parts.push(metadata.location);
  }

  // Add camera info
  if (includeCamera && (metadata.cameraMake || metadata.cameraModel)) {
    const camera = [metadata.cameraMake, metadata.cameraModel]
      .filter(Boolean)
      .join(' ');
    if (camera) {
      parts.push(`Shot on ${camera}`);
    }
  }

  // Apply template
  switch (template) {
    case 'simple':
      return parts.join(' • ');

    case 'minimal':
      return parts.join(', ');

    case 'detailed':
      return generateDetailedCaption(metadata, parts);

    case 'custom':
      return applyCustomTemplate(metadata, customTemplate || '', parts);

    default:
      return parts.join(' • ');
  }
}

/**
 * Generate detailed caption with technical details
 */
function generateDetailedCaption(
  metadata: PhotoMetadata,
  baseParts: string[]
): string {
  const parts = [...baseParts];

  // Add camera settings if available
  const settings: string[] = [];

  if (metadata.focalLength) {
    settings.push(`${metadata.focalLength}mm`);
  }

  if (metadata.aperture) {
    settings.push(`f/${metadata.aperture}`);
  }

  if (metadata.shutterSpeed) {
    settings.push(metadata.shutterSpeed);
  }

  if (metadata.iso) {
    settings.push(`ISO ${metadata.iso}`);
  }

  if (settings.length > 0) {
    parts.push(`(${settings.join(', ')})`);
  }

  return parts.join(' • ');
}

/**
 * Apply custom template with placeholders
 */
function applyCustomTemplate(
  metadata: PhotoMetadata,
  template: string,
  baseParts: string[]
): string {
  let result = template;

  // Date placeholders
  if (metadata.dateTaken) {
    const date =
      typeof metadata.dateTaken === 'string'
        ? new Date(metadata.dateTaken)
        : metadata.dateTaken;

    if (!isNaN(date.getTime())) {
      result = result
        .replace('{date}', format(date, 'MMMM d, yyyy'))
        .replace('{date:short}', format(date, 'MMM d, yyyy'))
        .replace('{date:long}', format(date, 'EEEE, MMMM d, yyyy'))
        .replace('{year}', format(date, 'yyyy'))
        .replace('{month}', format(date, 'MMMM'))
        .replace('{day}', format(date, 'd'));
    }
  }

  // Location placeholders
  result = result.replace('{location}', metadata.location || '');

  // Camera placeholders
  result = result.replace('{camera}', [metadata.cameraMake, metadata.cameraModel].filter(Boolean).join(' '));
  result = result.replace('{cameraMake}', metadata.cameraMake || '');
  result = result.replace('{cameraModel}', metadata.cameraModel || '');

  // Technical placeholders
  result = result.replace('{focalLength}', metadata.focalLength?.toString() || '');
  result = result.replace('{aperture}', metadata.aperture?.toString() || '');
  result = result.replace('{iso}', metadata.iso?.toString() || '');
  result = result.replace('{shutterSpeed}', metadata.shutterSpeed || '');

  // Clean up any remaining placeholders or double spaces
  result = result
    .replace(/\{[^}]+\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return result;
}

/**
 * Generate batch captions for multiple photos
 */
export function generateBatchCaptions(
  photos: Array<{ id: string; metadata: PhotoMetadata }>,
  options: CaptionOptions = {}
): Array<{ id: string; caption: string }> {
  return photos.map((photo) => ({
    id: photo.id,
    caption: generateCaption(photo.metadata, options),
  }));
}

/**
 * Smart caption generation with grouping by date/location
 */
export function generateSmartCaptions(
  photos: Array<{ id: string; metadata: PhotoMetadata }>,
  options: CaptionOptions = {}
): Array<{ id: string; caption: string; group?: string }> {
  // Group photos by date and location
  const groups = new Map<string, typeof photos>();

  photos.forEach((photo) => {
    const date = photo.metadata.dateTaken
      ? format(
          typeof photo.metadata.dateTaken === 'string'
            ? new Date(photo.metadata.dateTaken)
            : photo.metadata.dateTaken,
          'yyyy-MM-dd'
        )
      : 'unknown';

    const location = photo.metadata.location || 'unknown';
    const key = `${date}-${location}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(photo);
  });

  // Generate captions with group awareness
  const results: Array<{ id: string; caption: string; group?: string }> = [];

  groups.forEach((groupPhotos, groupKey) => {
    // For single photo groups, use full caption
    if (groupPhotos.length === 1) {
      results.push({
        id: groupPhotos[0].id,
        caption: generateCaption(groupPhotos[0].metadata, options),
      });
    } else {
      // For multi-photo groups, use minimal captions
      groupPhotos.forEach((photo, index) => {
        const caption = options.includeDate
          ? generateCaption(photo.metadata, {
              ...options,
              includeLocation: index === 0, // Only first photo shows location
            })
          : generateCaption(photo.metadata, { includeDate: false, includeLocation: false });

        results.push({
          id: photo.id,
          caption,
          group: groupKey,
        });
      });
    }
  });

  return results;
}

/**
 * Suggest caption templates based on photo count and metadata
 */
export function suggestCaptionStyle(
  photoCount: number,
  hasLocation: boolean,
  hasDate: boolean,
  hasCameraInfo: boolean
): CaptionOptions {
  // For large collections, use minimal captions
  if (photoCount > 50) {
    return {
      includeDate: hasDate,
      includeLocation: false,
      includeCamera: false,
      template: 'minimal',
    };
  }

  // For medium collections, use simple captions
  if (photoCount > 20) {
    return {
      includeDate: hasDate,
      includeLocation: hasLocation,
      includeCamera: false,
      template: 'simple',
    };
  }

  // For small collections, use detailed captions
  return {
    includeDate: hasDate,
    includeLocation: hasLocation,
    includeCamera: hasCameraInfo,
    template: 'detailed',
  };
}

/**
 * Extract location name from coordinates using reverse geocoding
 * (Requires external API - this is a placeholder)
 */
export async function getLocationFromCoordinates(
  lat: number,
  long: number
): Promise<string | null> {
  // TODO: Implement reverse geocoding using a service like:
  // - Google Maps Geocoding API
  // - OpenStreetMap Nominatim
  // - Mapbox Geocoding API

  // For now, return coordinate string
  return `${lat.toFixed(4)}, ${long.toFixed(4)}`;
}
