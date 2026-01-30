import { test, expect } from '@playwright/test';

/**
 * PM-006: Interior Template Versioning E2E Tests
 *
 * Tests for template versioning system that ensures
 * reprints use the exact same template version
 */

test.describe('Interior Template Versioning - PM-006', () => {
  test('should create and retrieve template versions', async ({ page }) => {
    // This test verifies the API layer for creating template versions
    const templateData = {
      templateId: 'test-template-001',
      config: {
        pageSize: { width: 210, height: 297, unit: 'mm' },
        margins: { top: 20, bottom: 20, left: 15, right: 15 },
        fontSize: { body: 12, heading1: 24, heading2: 18 },
        lineHeight: 1.5,
      },
      metadata: {
        name: 'Classic Interior v1',
        category: 'custom-interior',
        releaseNotes: 'Initial release',
      },
    };

    // Create template version via API
    const response = await page.request.post('/api/templates/versions', {
      data: templateData,
    });

    expect(response.status()).toBe(201);
    const createdVersion = await response.json();
    expect(createdVersion.id).toBeTruthy();
    expect(createdVersion.version).toBe(1);
    expect(createdVersion.name).toBe('Classic Interior v1');
  });

  test('should snapshot template version with rendition', async ({ page }) => {
    // When a user generates a PDF, the template version should be locked
    const renditionId = 'test-rendition-001';
    const templateVersionId = 'test-template-v1-001';

    const response = await page.request.post('/api/templates/versions/snapshot', {
      data: {
        renditionId,
        templateVersionId,
        templateCategory: 'custom-interior',
      },
    });

    expect(response.status()).toBe(201);
    const snapshot = await response.json();
    expect(snapshot.renditionId).toBe(renditionId);
    expect(snapshot.templateVersionId).toBe(templateVersionId);
    expect(snapshot.snapshotDate).toBeTruthy();
  });

  test('should retrieve template version for reordering', async ({ page }) => {
    // When reordering, we need to fetch the exact template version used
    const renditionId = 'test-rendition-with-version';

    // First create a snapshot
    await page.request.post('/api/templates/versions/snapshot', {
      data: {
        renditionId,
        templateVersionId: 'test-template-v1-001',
        templateCategory: 'custom-interior',
      },
    });

    // Now retrieve it
    const response = await page.request.get(
      `/api/templates/versions/snapshot/${renditionId}`
    );

    expect(response.status()).toBe(200);
    const snapshot = await response.json();
    expect(snapshot.renditionId).toBe(renditionId);
    expect(snapshot.templateConfig).toBeTruthy();
  });

  test('should validate template configuration', async ({ page }) => {
    // Invalid config should be rejected
    const invalidConfig = {
      pageSize: { width: -10, height: 297, unit: 'mm' }, // Invalid: negative width
      margins: { top: 20, bottom: 20, left: 15, right: 15 },
      fontSize: { body: 12, heading1: 24, heading2: 18 },
      lineHeight: 1.5,
    };

    const response = await page.request.post('/api/templates/versions/validate', {
      data: invalidConfig,
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.errors).toBeTruthy();
    expect(error.errors.length).toBeGreaterThan(0);
  });

  test('should track template version history', async ({ page }) => {
    const templateId = 'test-template-history';

    // Create multiple versions
    const version1 = await page.request.post('/api/templates/versions', {
      data: {
        templateId,
        config: {
          pageSize: { width: 210, height: 297, unit: 'mm' },
          margins: { top: 20, bottom: 20, left: 15, right: 15 },
          fontSize: { body: 12, heading1: 24, heading2: 18 },
          lineHeight: 1.5,
        },
        metadata: { name: 'Version 1', category: 'custom-interior' },
      },
    });

    const version2 = await page.request.post('/api/templates/versions', {
      data: {
        templateId,
        config: {
          pageSize: { width: 210, height: 297, unit: 'mm' },
          margins: { top: 25, bottom: 25, left: 20, right: 20 }, // Larger margins
          fontSize: { body: 12, heading1: 24, heading2: 18 },
          lineHeight: 1.5,
        },
        metadata: { name: 'Version 2', category: 'custom-interior' },
      },
    });

    expect(version1.status()).toBe(201);
    expect(version2.status()).toBe(201);

    // Get history
    const historyResponse = await page.request.get(
      `/api/templates/versions/history/${templateId}`
    );
    expect(historyResponse.status()).toBe(200);

    const history = await historyResponse.json();
    expect(history.versions.length).toBe(2);
    expect(history.versions[0].version).toBe(2); // Latest first
    expect(history.versions[1].version).toBe(1);
  });

  test('should get latest active template version', async ({ page }) => {
    const templateId = 'test-template-latest';

    // Create a version
    const createResponse = await page.request.post('/api/templates/versions', {
      data: {
        templateId,
        config: {
          pageSize: { width: 210, height: 297, unit: 'mm' },
          margins: { top: 20, bottom: 20, left: 15, right: 15 },
          fontSize: { body: 12, heading1: 24, heading2: 18 },
          lineHeight: 1.5,
        },
        metadata: { name: 'Latest Version', category: 'custom-interior' },
      },
    });

    expect(createResponse.status()).toBe(201);

    // Get latest
    const latestResponse = await page.request.get(
      `/api/templates/versions/latest/${templateId}`
    );
    expect(latestResponse.status()).toBe(200);

    const latest = await latestResponse.json();
    expect(latest.name).toBe('Latest Version');
    expect(latest.isActive).toBe(true);
  });
});
