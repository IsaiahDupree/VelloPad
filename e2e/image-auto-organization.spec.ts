import { test, expect } from '@playwright/test';

/**
 * PB-003: Image Auto-Organization E2E Tests
 *
 * Tests for automatic image organization by date using EXIF metadata.
 * Verifies photos are grouped by month and organized chronologically.
 */

test.describe('Image Auto-Organization - PB-003', () => {
  test('should organize images by month from EXIF data', async ({ page }) => {
    // Test data: images from different months
    const imagesWithExif = [
      {
        fileName: 'photo1.jpg',
        exifData: {
          dateTimeOriginal: new Date('2025-01-15'),
          make: 'Canon',
          model: 'EOS 5D',
        },
      },
      {
        fileName: 'photo2.jpg',
        exifData: {
          dateTimeOriginal: new Date('2025-01-20'),
          make: 'Canon',
          model: 'EOS 5D',
        },
      },
      {
        fileName: 'photo3.jpg',
        exifData: {
          dateTimeOriginal: new Date('2025-02-10'),
          make: 'iPhone',
          model: '14 Pro',
        },
      },
    ];

    // Call organization API
    const response = await page.request.post('/api/photos/organize', {
      data: { images: imagesWithExif },
    });

    expect(response.status()).toBe(200);
    const organized = await response.json();

    // Verify grouping by month
    expect(organized.groups.length).toBe(2); // January and February
    expect(organized.groups[0].key).toBe('2025-01'); // Most recent first
    expect(organized.groups[0].label).toBe('January 2025');
    expect(organized.groups[0].images.length).toBe(2);

    expect(organized.groups[1].key).toBe('2025-02');
    expect(organized.groups[1].images.length).toBe(1);
  });

  test('should handle images without EXIF date gracefully', async ({ page }) => {
    const images = [
      {
        fileName: 'no-exif.jpg',
        exifData: {}, // No date data
        uploadDate: new Date('2025-01-15'),
      },
      {
        fileName: 'with-exif.jpg',
        exifData: {
          dateTimeOriginal: new Date('2025-01-20'),
        },
      },
    ];

    const response = await page.request.post('/api/photos/organize', {
      data: { images },
    });

    expect(response.status()).toBe(200);
    const organized = await response.json();

    // Both should be organized
    expect(organized.groups.length).toBe(1);
    expect(organized.groups[0].images.length).toBe(2);
  });

  test('should extract camera information from EXIF', async ({ page }) => {
    const images = [
      {
        fileName: 'canon-photo.jpg',
        exifData: {
          dateTimeOriginal: new Date('2025-01-15'),
          make: 'Canon',
          model: 'EOS 5D Mark IV',
        },
      },
      {
        fileName: 'iphone-photo.jpg',
        exifData: {
          dateTimeOriginal: new Date('2025-01-15'),
          make: 'Apple',
          model: 'iPhone 14 Pro',
        },
      },
    ];

    const response = await page.request.post('/api/photos/organize', {
      data: { images },
    });

    expect(response.status()).toBe(200);
    const organized = await response.json();

    const group = organized.groups[0];
    expect(group.images[0].camera).toBe('Canon EOS 5D Mark IV');
    expect(group.images[1].camera).toBe('Apple iPhone 14 Pro');
  });

  test('should extract location from EXIF coordinates', async ({ page }) => {
    const images = [
      {
        fileName: 'location-photo.jpg',
        exifData: {
          dateTimeOriginal: new Date('2025-01-15'),
          latitude: 51.5074,
          longitude: -0.1278, // London
        },
      },
    ];

    const response = await page.request.post('/api/photos/organize', {
      data: { images },
    });

    expect(response.status()).toBe(200);
    const organized = await response.json();

    const image = organized.groups[0].images[0];
    expect(image.coordinates).toBeDefined();
    expect(image.coordinates.latitude).toBe(51.5074);
    expect(image.coordinates.longitude).toBe(-0.1278);
  });

  test('should maintain chronological order within month groups', async ({ page }) => {
    const images = [
      {
        fileName: 'jan20.jpg',
        exifData: { dateTimeOriginal: new Date('2025-01-20') },
      },
      {
        fileName: 'jan15.jpg',
        exifData: { dateTimeOriginal: new Date('2025-01-15') },
      },
      {
        fileName: 'jan10.jpg',
        exifData: { dateTimeOriginal: new Date('2025-01-10') },
      },
      {
        fileName: 'jan25.jpg',
        exifData: { dateTimeOriginal: new Date('2025-01-25') },
      },
    ];

    const response = await page.request.post('/api/photos/organize', {
      data: { images },
    });

    expect(response.status()).toBe(200);
    const organized = await response.json();

    const group = organized.groups[0];
    // Should be sorted by date ascending within group
    expect(group.images[0].fileName).toBe('jan10.jpg');
    expect(group.images[1].fileName).toBe('jan15.jpg');
    expect(group.images[2].fileName).toBe('jan20.jpg');
    expect(group.images[3].fileName).toBe('jan25.jpg');
  });

  test('should handle multi-year organization', async ({ page }) => {
    const images = [
      {
        fileName: '2024-12.jpg',
        exifData: { dateTimeOriginal: new Date('2024-12-15') },
      },
      {
        fileName: '2025-01.jpg',
        exifData: { dateTimeOriginal: new Date('2025-01-15') },
      },
      {
        fileName: '2025-02.jpg',
        exifData: { dateTimeOriginal: new Date('2025-02-15') },
      },
    ];

    const response = await page.request.post('/api/photos/organize', {
      data: { images },
    });

    expect(response.status()).toBe(200);
    const organized = await response.json();

    expect(organized.groups.length).toBe(3);
    expect(organized.groups[0].key).toBe('2025-02');
    expect(organized.groups[1].key).toBe('2025-01');
    expect(organized.groups[2].key).toBe('2024-12');
  });

  test('should validate EXIF metadata structure', async ({ page }) => {
    const invalidImages = [
      {
        fileName: 'invalid.jpg',
        exifData: {
          dateTimeOriginal: 'invalid-date-string', // Invalid format
          latitude: 'not-a-number', // Invalid coordinate
        },
      },
    ];

    const response = await page.request.post('/api/photos/organize', {
      data: { images: invalidImages },
    });

    // Should handle gracefully, not crash
    expect(response.status()).toBeOneOf([200, 400]);
    const result = await response.json();

    if (response.status() === 400) {
      expect(result.errors).toBeDefined();
    }
  });

  test('should return formatted date range labels for groups', async ({ page }) => {
    const images = [
      {
        fileName: 'photo1.jpg',
        exifData: { dateTimeOriginal: new Date('2025-01-05') },
      },
      {
        fileName: 'photo2.jpg',
        exifData: { dateTimeOriginal: new Date('2025-01-15') },
      },
      {
        fileName: 'photo3.jpg',
        exifData: { dateTimeOriginal: new Date('2025-01-28') },
      },
    ];

    const response = await page.request.post('/api/photos/organize', {
      data: { images },
    });

    expect(response.status()).toBe(200);
    const organized = await response.json();

    const group = organized.groups[0];
    // Should have formatted label showing date range
    expect(group.dateRangeLabel).toMatch(/Jan \d+-\d+, \d{4}/); // "Jan 5-28, 2025"
  });

  test('should support merging multiple photo uploads', async ({ page }) => {
    // First batch
    const batch1 = await page.request.post('/api/photos/organize', {
      data: {
        images: [
          {
            fileName: 'batch1-photo1.jpg',
            exifData: { dateTimeOriginal: new Date('2025-01-10') },
          },
        ],
      },
    });

    // Second batch
    const batch2 = await page.request.post('/api/photos/organize', {
      data: {
        images: [
          {
            fileName: 'batch2-photo1.jpg',
            exifData: { dateTimeOriginal: new Date('2025-01-20') },
          },
        ],
      },
    });

    // Merge batches
    const merged1 = await batch1.json();
    const merged2 = await batch2.json();

    const mergeResponse = await page.request.post('/api/photos/merge-organizations', {
      data: {
        collections: [merged1.groups, merged2.groups],
      },
    });

    expect(mergeResponse.status()).toBe(200);
    const merged = await mergeResponse.json();

    // Should have both images in same month
    expect(merged.groups[0].images.length).toBe(2);
  });

  test('should track metadata extraction completeness', async ({ page }) => {
    const images = [
      {
        fileName: 'full-metadata.jpg',
        exifData: {
          dateTimeOriginal: new Date('2025-01-15'),
          make: 'Canon',
          model: 'EOS 5D',
          latitude: 51.5074,
          longitude: -0.1278,
          iso: 400,
          fNumber: 2.8,
        },
      },
      {
        fileName: 'minimal-metadata.jpg',
        exifData: {
          dateTimeOriginal: new Date('2025-01-15'),
        },
      },
    ];

    const response = await page.request.post('/api/photos/organize', {
      data: { images },
    });

    expect(response.status()).toBe(200);
    const organized = await response.json();

    const group = organized.groups[0];
    expect(group.images[0].metadataCompleteness).toBeGreaterThan(
      group.images[1].metadataCompleteness
    );
  });
});
