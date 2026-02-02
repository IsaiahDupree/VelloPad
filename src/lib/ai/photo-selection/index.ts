/**
 * AI Smart Photo Selection (PB-024)
 *
 * AI-powered removal of duplicates and blurry images
 * Uses image analysis to improve photo book quality
 *
 * Dependencies: PB-001 (Photo Upload)
 */

export interface PhotoQualityScore {
  imageId: string;
  url: string;
  scores: {
    sharpness: number; // 0-100 (higher = sharper)
    brightness: number; // 0-100
    contrast: number; // 0-100
    colorfulness: number; // 0-100
    overall: number; // 0-100 (weighted average)
  };
  issues: string[]; // e.g., ["blurry", "underexposed", "duplicate"]
  isRecommended: boolean;
  similarImages: string[]; // IDs of similar images (for duplicate detection)
}

export interface PhotoSelectionResult {
  totalImages: number;
  recommendedImages: PhotoQualityScore[];
  rejectedImages: PhotoQualityScore[];
  duplicateGroups: string[][]; // Groups of duplicate image IDs
}

/**
 * Analyze a single photo for quality metrics
 */
export async function analyzePhotoQuality(
  imageUrl: string
): Promise<PhotoQualityScore['scores']> {
  // This would call an AI service (OpenAI Vision, Google Cloud Vision, AWS Rekognition)
  // For now, we'll use a placeholder implementation

  try {
    // Load image and perform basic analysis
    const image = await loadImage(imageUrl);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Calculate sharpness (Laplacian variance)
    const sharpness = calculateSharpness(data, canvas.width, canvas.height);

    // Calculate brightness
    const brightness = calculateBrightness(data);

    // Calculate contrast
    const contrast = calculateContrast(data);

    // Calculate colorfulness
    const colorfulness = calculateColorfulness(data);

    // Overall score (weighted average)
    const overall =
      sharpness * 0.4 + brightness * 0.2 + contrast * 0.2 + colorfulness * 0.2;

    return {
      sharpness,
      brightness,
      contrast,
      colorfulness,
      overall,
    };
  } catch (error) {
    console.error('Error analyzing photo quality:', error);
    // Return neutral scores on error
    return {
      sharpness: 50,
      brightness: 50,
      contrast: 50,
      colorfulness: 50,
      overall: 50,
    };
  }
}

/**
 * Calculate sharpness using Laplacian variance
 */
function calculateSharpness(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number {
  // Simplified sharpness calculation
  // In production, use proper Laplacian operator
  let variance = 0;
  let mean = 0;
  const sampleSize = Math.min(1000, (width * height) / 4);

  for (let i = 0; i < sampleSize; i++) {
    const idx = Math.floor(Math.random() * data.length / 4) * 4;
    const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    mean += gray;
  }
  mean /= sampleSize;

  for (let i = 0; i < sampleSize; i++) {
    const idx = Math.floor(Math.random() * data.length / 4) * 4;
    const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    variance += Math.pow(gray - mean, 2);
  }

  variance /= sampleSize;

  // Normalize to 0-100 scale
  const sharpness = Math.min(100, variance / 10);
  return sharpness;
}

/**
 * Calculate brightness (average luminance)
 */
function calculateBrightness(data: Uint8ClampedArray): number {
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    // Convert to luminance
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += luminance;
  }
  const avgLuminance = sum / (data.length / 4);
  return (avgLuminance / 255) * 100;
}

/**
 * Calculate contrast (standard deviation of luminance)
 */
function calculateContrast(data: Uint8ClampedArray): number {
  const brightness = calculateBrightness(data);
  const avgLuminance = (brightness / 100) * 255;

  let variance = 0;
  for (let i = 0; i < data.length; i += 4) {
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    variance += Math.pow(luminance - avgLuminance, 2);
  }

  const stdDev = Math.sqrt(variance / (data.length / 4));
  return Math.min(100, (stdDev / 128) * 100);
}

/**
 * Calculate colorfulness (saturation)
 */
function calculateColorfulness(data: Uint8ClampedArray): number {
  let saturationSum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : ((max - min) / max) * 100;
    saturationSum += saturation;
  }

  return saturationSum / (data.length / 4);
}

/**
 * Detect duplicate images using perceptual hashing
 */
export async function detectDuplicates(
  imageUrls: string[]
): Promise<string[][]> {
  // This would use perceptual hashing (pHash) or image embeddings
  // For now, return empty array
  const duplicateGroups: string[][] = [];

  // TODO: Implement proper duplicate detection
  // Options:
  // 1. Use pHash library (e.g., sharp + image-hash)
  // 2. Use AI embeddings (OpenAI CLIP, Google Vision)
  // 3. Compare EXIF timestamps + file sizes

  return duplicateGroups;
}

/**
 * Smart photo selection for a project
 */
export async function selectBestPhotos(
  images: Array<{ id: string; url: string }>
): Promise<PhotoSelectionResult> {
  const qualityScores: PhotoQualityScore[] = [];

  // Analyze each image
  for (const image of images) {
    const scores = await analyzePhotoQuality(image.url);

    const issues: string[] = [];
    if (scores.sharpness < 30) issues.push('blurry');
    if (scores.brightness < 20) issues.push('underexposed');
    if (scores.brightness > 90) issues.push('overexposed');
    if (scores.contrast < 20) issues.push('low contrast');

    const isRecommended = scores.overall >= 50 && issues.length === 0;

    qualityScores.push({
      imageId: image.id,
      url: image.url,
      scores,
      issues,
      isRecommended,
      similarImages: [], // TODO: populate from duplicate detection
    });
  }

  // Detect duplicates
  const duplicateGroups = await detectDuplicates(images.map(img => img.url));

  // Mark duplicates in quality scores
  duplicateGroups.forEach(group => {
    group.slice(1).forEach(url => {
      const score = qualityScores.find(s => s.url === url);
      if (score) {
        score.issues.push('duplicate');
        score.isRecommended = false;
      }
    });
  });

  return {
    totalImages: images.length,
    recommendedImages: qualityScores.filter(s => s.isRecommended),
    rejectedImages: qualityScores.filter(s => !s.isRecommended),
    duplicateGroups,
  };
}

/**
 * Helper to load image (browser or Node.js)
 */
async function loadImage(url: string): Promise<HTMLImageElement | any> {
  if (typeof window !== 'undefined') {
    // Browser
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  } else {
    // Node.js
    const sharp = await import('sharp');
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return sharp.default(buffer);
  }
}

/**
 * Helper to create canvas (browser or Node.js)
 */
function createCanvas(width: number, height: number): HTMLCanvasElement | any {
  if (typeof window !== 'undefined') {
    // Browser
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  } else {
    // Node.js - use node-canvas
    // const { createCanvas } = require('canvas');
    // return createCanvas(width, height);
    throw new Error('Canvas creation not supported in Node.js environment');
  }
}
