/**
 * E2E Test: Segment Engine (GDP-012)
 *
 * Tests the segment evaluation engine that determines which persons belong
 * to which segments based on filter criteria and person features
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test.describe('Segment Engine (GDP-012)', () => {
  let supabase: ReturnType<typeof createClient>;
  let testPersonId: string;
  let testSegmentId: string;

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);
  });

  test.beforeEach(async () => {
    // Create a test person
    const { data: person, error: personError } = await supabase
      .from('person')
      .insert({
        email: `test-segment-${Date.now()}@example.com`,
        first_name: 'Test',
        last_name: 'User',
        lifecycle_stage: 'lead',
      })
      .select()
      .single();

    if (personError) throw personError;
    testPersonId = person.id;

    // Create test segment
    const { data: segment, error: segmentError } = await supabase
      .from('segment')
      .insert({
        segment_name: `Test Segment ${Date.now()}`,
        segment_key: `test_segment_${Date.now()}`,
        description: 'Test segment for E2E testing',
        segment_type: 'dynamic',
        filter_criteria: {
          books_created: { $gte: 1 },
          engagement_score: { $gte: 40 },
        },
      })
      .select()
      .single();

    if (segmentError) throw segmentError;
    testSegmentId = segment.id;
  });

  test.afterEach(async () => {
    // Clean up test data
    if (testSegmentId) {
      await supabase.from('segment').delete().eq('id', testSegmentId);
    }
    if (testPersonId) {
      await supabase.from('person').delete().eq('id', testPersonId);
    }
  });

  test('should evaluate person against segment filter criteria', async () => {
    // Create person features that match the segment
    const { error: featuresError } = await supabase.from('person_features').upsert({
      person_id: testPersonId,
      books_created: 2,
      engagement_score: 65,
      active_days_30d: 10,
      words_written: 5000,
    });

    expect(featuresError).toBeNull();

    // Call segment evaluation endpoint
    const response = await fetch(`http://localhost:3000/api/segments/${testSegmentId}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personId: testPersonId,
      }),
    });

    expect(response.ok).toBeTruthy();

    const result = await response.json();
    expect(result.matches).toBe(true);
    expect(result.segmentId).toBe(testSegmentId);
    expect(result.personId).toBe(testPersonId);
  });

  test('should not match person who does not meet criteria', async () => {
    // Create person features that DO NOT match the segment
    const { error: featuresError } = await supabase.from('person_features').upsert({
      person_id: testPersonId,
      books_created: 0, // Segment requires >= 1
      engagement_score: 20, // Segment requires >= 40
      active_days_30d: 2,
      words_written: 100,
    });

    expect(featuresError).toBeNull();

    // Call segment evaluation endpoint
    const response = await fetch(`http://localhost:3000/api/segments/${testSegmentId}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personId: testPersonId,
      }),
    });

    expect(response.ok).toBeTruthy();

    const result = await response.json();
    expect(result.matches).toBe(false);
    expect(result.segmentId).toBe(testSegmentId);
    expect(result.personId).toBe(testPersonId);
  });

  test('should compute segment membership for all persons', async () => {
    // Create multiple test persons with different features
    const person1 = await supabase
      .from('person')
      .insert({
        email: `test-segment-1-${Date.now()}@example.com`,
        lifecycle_stage: 'activated',
      })
      .select()
      .single();

    const person2 = await supabase
      .from('person')
      .insert({
        email: `test-segment-2-${Date.now()}@example.com`,
        lifecycle_stage: 'lead',
      })
      .select()
      .single();

    // Add features - person1 matches, person2 does not
    await supabase.from('person_features').upsert([
      {
        person_id: person1.data!.id,
        books_created: 3,
        engagement_score: 70,
      },
      {
        person_id: person2.data!.id,
        books_created: 0,
        engagement_score: 10,
      },
    ]);

    // Trigger segment membership computation
    const response = await fetch(
      `http://localhost:3000/api/segments/${testSegmentId}/compute-membership`,
      {
        method: 'POST',
      }
    );

    expect(response.ok).toBeTruthy();

    const result = await response.json();
    expect(result.segmentId).toBe(testSegmentId);
    expect(result.membersAdded).toBeGreaterThanOrEqual(1);
    expect(result.membersRemoved).toBeGreaterThanOrEqual(0);

    // Check segment_membership table
    const { data: membership } = await supabase
      .from('segment_membership')
      .select('*')
      .eq('segment_id', testSegmentId)
      .is('exited_at', null);

    // Person1 should be in segment, person2 should not
    const person1InSegment = membership?.some((m) => m.person_id === person1.data!.id);
    const person2InSegment = membership?.some((m) => m.person_id === person2.data!.id);

    expect(person1InSegment).toBe(true);
    expect(person2InSegment).toBe(false);

    // Clean up
    await supabase.from('person').delete().eq('id', person1.data!.id);
    await supabase.from('person').delete().eq('id', person2.data!.id);
  });

  test('should update segment member count after computation', async () => {
    // Get initial segment
    const { data: initialSegment } = await supabase
      .from('segment')
      .select('member_count')
      .eq('id', testSegmentId)
      .single();

    const initialCount = initialSegment?.member_count || 0;

    // Add matching person features
    await supabase.from('person_features').upsert({
      person_id: testPersonId,
      books_created: 5,
      engagement_score: 85,
    });

    // Compute membership
    const response = await fetch(
      `http://localhost:3000/api/segments/${testSegmentId}/compute-membership`,
      {
        method: 'POST',
      }
    );

    expect(response.ok).toBeTruthy();

    // Check updated member count
    const { data: updatedSegment } = await supabase
      .from('segment')
      .select('member_count, last_computed_at')
      .eq('id', testSegmentId)
      .single();

    expect(updatedSegment?.member_count).toBeGreaterThan(initialCount);
    expect(updatedSegment?.last_computed_at).not.toBeNull();
  });

  test('should handle complex filter criteria with multiple conditions', async () => {
    // Create segment with complex criteria
    const { data: complexSegment } = await supabase
      .from('segment')
      .insert({
        segment_name: `Complex Segment ${Date.now()}`,
        segment_key: `complex_segment_${Date.now()}`,
        description: 'Complex multi-condition segment',
        segment_type: 'dynamic',
        filter_criteria: {
          $and: [
            { books_created: { $gte: 1 } },
            { words_written: { $gte: 1000 } },
            {
              $or: [
                { pdfs_generated: { $gte: 1 } },
                { engagement_score: { $gte: 80 } },
              ],
            },
          ],
        },
      })
      .select()
      .single();

    // Person with matching features
    await supabase.from('person_features').upsert({
      person_id: testPersonId,
      books_created: 2,
      words_written: 5000,
      pdfs_generated: 1,
      engagement_score: 50,
    });

    const response = await fetch(
      `http://localhost:3000/api/segments/${complexSegment!.id}/evaluate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personId: testPersonId,
        }),
      }
    );

    expect(response.ok).toBeTruthy();

    const result = await response.json();
    expect(result.matches).toBe(true);

    // Clean up
    await supabase.from('segment').delete().eq('id', complexSegment!.id);
  });

  test('should handle person lifecycle stage in filter criteria', async () => {
    // Create segment targeting specific lifecycle stage
    const { data: lifecycleSegment } = await supabase
      .from('segment')
      .insert({
        segment_name: `Lifecycle Segment ${Date.now()}`,
        segment_key: `lifecycle_segment_${Date.now()}`,
        description: 'Targets activated customers',
        segment_type: 'dynamic',
        filter_criteria: {
          lifecycle_stage: 'activated',
          books_created: { $gte: 1 },
        },
      })
      .select()
      .single();

    // Update person lifecycle stage
    await supabase
      .from('person')
      .update({ lifecycle_stage: 'activated' })
      .eq('id', testPersonId);

    // Add matching features
    await supabase.from('person_features').upsert({
      person_id: testPersonId,
      books_created: 3,
    });

    const response = await fetch(
      `http://localhost:3000/api/segments/${lifecycleSegment!.id}/evaluate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personId: testPersonId,
        }),
      }
    );

    expect(response.ok).toBeTruthy();

    const result = await response.json();
    expect(result.matches).toBe(true);

    // Clean up
    await supabase.from('segment').delete().eq('id', lifecycleSegment!.id);
  });

  test('should trigger automation when person enters segment', async () => {
    // This test verifies that segment membership changes can trigger automations
    // For now, we just verify the membership tracking works correctly

    // Initial state: person does not match
    await supabase.from('person_features').upsert({
      person_id: testPersonId,
      books_created: 0,
      engagement_score: 10,
    });

    // Compute membership (should not be in segment)
    await fetch(`http://localhost:3000/api/segments/${testSegmentId}/compute-membership`, {
      method: 'POST',
    });

    const { data: initialMembership } = await supabase
      .from('segment_membership')
      .select('*')
      .eq('segment_id', testSegmentId)
      .eq('person_id', testPersonId)
      .is('exited_at', null);

    expect(initialMembership).toHaveLength(0);

    // Update features to match segment
    await supabase.from('person_features').upsert({
      person_id: testPersonId,
      books_created: 2,
      engagement_score: 70,
    });

    // Recompute membership (should now be in segment)
    const response = await fetch(
      `http://localhost:3000/api/segments/${testSegmentId}/compute-membership`,
      {
        method: 'POST',
      }
    );

    expect(response.ok).toBeTruthy();

    // Verify person entered segment
    const { data: newMembership } = await supabase
      .from('segment_membership')
      .select('*')
      .eq('segment_id', testSegmentId)
      .eq('person_id', testPersonId)
      .is('exited_at', null);

    expect(newMembership).toHaveLength(1);
    expect(newMembership![0].entered_at).not.toBeNull();
    expect(newMembership![0].exited_at).toBeNull();
  });
});
