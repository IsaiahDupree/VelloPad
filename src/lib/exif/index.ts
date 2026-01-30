/**
 * PB-003: Image Auto-Organization via EXIF Metadata
 *
 * Automatically organizes uploaded images by date using EXIF metadata.
 * Extracts photo date taken, location, and other metadata for smart organization.
 *
 * Features:
 * - Parse EXIF data from images
 * - Extract date taken, location, camera model
 * - Organize images into date-based collections
 * - Handle images without EXIF gracefully
 */

export interface ExifData {
  dateTime?: Date;
  dateTimeOriginal?: Date;
  dateTimeDigitized?: Date;
  make?: string; // Camera manufacturer
  model?: string; // Camera model
  latitude?: number;
  longitude?: number;
  altitude?: number;
  orientation?: number;
  exposureTime?: number;
  fNumber?: number;
  iso?: number;
  focalLength?: number;
  software?: string;
  description?: string;
  userComment?: string;
}

export interface ImageOrganization {
  originalFileName: string;
  organizationKey: string; // e.g., "2025-01" or "2025-01-15"
  organizationLabel: string; // e.g., "January 2025" or "January 15, 2025"
  exifData: Partial<ExifData>;
  dateTaken?: Date;
  coordinates?: { latitude: number; longitude: number };
}

/**
 * Parse EXIF data from an image Blob
 * Uses the EXIF.js library patterns (we'll use a simple implementation here)
 */
export async function extractExifData(imageBlob: Blob): Promise<Partial<ExifData>> {
  try {
    // If image is too small, likely no EXIF data
    if (imageBlob.size < 1000) {
      return {};
    }

    // For client-side EXIF extraction, we'd typically use a library like piexifjs
    // For now, return a stub that can be enhanced with actual EXIF library
    return await extractExifFromBlobStub(imageBlob);
  } catch (error) {
    console.warn('[PB-003] Failed to extract EXIF data:', error);
    return {};
  }
}

/**
 * Extract EXIF from Blob - stub implementation
 * In production, integrate with piexifjs or exifr library
 */
async function extractExifFromBlobStub(blob: Blob): Promise<Partial<ExifData>> {
  // This is a stub - in production use piexifjs or exifr
  // For now, return empty to avoid errors
  // The actual implementation would:
  // 1. Convert Blob to ArrayBuffer
  // 2. Parse JPEG/PNG headers
  // 3. Extract EXIF IFD
  // 4. Return parsed data
  return {};
}

/**
 * Parse EXIF data for organization
 * Generates organizational key and label based on date taken
 */
export function parseExifForOrganization(
  fileName: string,
  exifData: Partial<ExifData>,
  fallbackDate?: Date
): ImageOrganization {
  const dateTaken = exifData.dateTimeOriginal || exifData.dateTime || fallbackDate || new Date();

  // Organize by month (YYYY-MM)
  const year = dateTaken.getFullYear();
  const month = String(dateTaken.getMonth() + 1).padStart(2, '0');
  const organizationKey = `${year}-${month}`;

  // Format label like "January 2025"
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    dateTaken
  );

  return {
    originalFileName: fileName,
    organizationKey,
    organizationLabel: monthName,
    exifData,
    dateTaken,
    coordinates:
      exifData.latitude && exifData.longitude
        ? { latitude: exifData.latitude, longitude: exifData.longitude }
        : undefined,
  };
}

/**
 * Organize multiple images by date
 * Groups them by month
 */
export function organizeImagesByDate(
  images: Array<{
    fileName: string;
    exifData: Partial<ExifData>;
    uploadDate?: Date;
  }>
): Map<string, ImageOrganization[]> {
  const organized = new Map<string, ImageOrganization[]>();

  for (const image of images) {
    const org = parseExifForOrganization(image.fileName, image.exifData, image.uploadDate);

    if (!organized.has(org.organizationKey)) {
      organized.set(org.organizationKey, []);
    }

    organized.get(org.organizationKey)!.push(org);
  }

  // Sort by date descending (most recent first)
  const sortedMap = new Map(
    Array.from(organized.entries()).sort(([keyA], [keyB]) => keyB.localeCompare(keyA))
  );

  return sortedMap;
}

/**
 * Format date range for a group of images
 */
export function formatDateRangeLabel(images: ImageOrganization[]): string {
  if (images.length === 0) return 'Unknown Date';

  const dates = images
    .filter((img) => img.dateTaken)
    .map((img) => img.dateTaken!)
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) return images[0].organizationLabel;

  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];

  if (firstDate.getMonth() === lastDate.getMonth()) {
    // Same month - show as "Jan 15-28, 2025"
    return `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } else {
    // Different months - show range
    return `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
}

/**
 * Extract location string from EXIF coordinates
 * In production, would reverse-geocode to get city/country names
 */
export function formatLocationFromExif(exifData: Partial<ExifData>): string | null {
  if (!exifData.latitude || !exifData.longitude) {
    return null;
  }

  return `${exifData.latitude.toFixed(4)}, ${exifData.longitude.toFixed(4)}`;
}

/**
 * Extract camera info from EXIF
 */
export function formatCameraFromExif(exifData: Partial<ExifData>): string | null {
  const make = exifData.make;
  const model = exifData.model;

  if (!make && !model) {
    return null;
  }

  if (make && model) {
    return `${make} ${model}`;
  }

  return make || model || null;
}

/**
 * Validate image metadata is complete before organization
 */
export function validateImageMetadata(
  exifData: Partial<ExifData>
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (!exifData.dateTimeOriginal && !exifData.dateTime) {
    warnings.push('No date taken information found in image');
  }

  if (exifData.orientation && (exifData.orientation < 1 || exifData.orientation > 8)) {
    warnings.push('Invalid orientation value in EXIF');
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Merge multiple photo collections into one
 * Useful when combining photos from multiple uploads
 */
export function mergePhotoOrganizations(
  collections: Array<Map<string, ImageOrganization[]>>
): Map<string, ImageOrganization[]> {
  const merged = new Map<string, ImageOrganization[]>();

  for (const collection of collections) {
    for (const [key, images] of collection) {
      if (!merged.has(key)) {
        merged.set(key, []);
      }
      merged.get(key)!.push(...images);
    }
  }

  // Sort within each group by date
  for (const images of merged.values()) {
    images.sort((a, b) => {
      const dateA = a.dateTaken?.getTime() || 0;
      const dateB = b.dateTaken?.getTime() || 0;
      return dateA - dateB;
    });
  }

  return merged;
}
