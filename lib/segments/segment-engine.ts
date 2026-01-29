/**
 * Segment Engine
 * Feature: GDP-012
 *
 * Evaluates segment membership and triggers automations based on filter criteria
 *
 * Core capabilities:
 * - Evaluate if a person matches segment filter criteria
 * - Compute segment membership for all persons
 * - Track segment entry/exit events
 * - Trigger automations (Resend, Meta, outbound) when persons enter/exit segments
 */

import { createClient } from '@/lib/supabase/server';
import type { PersonFeatures } from '@/lib/features/person-features';

export interface Segment {
  id: string;
  segment_name: string;
  segment_key: string;
  description: string | null;
  filter_criteria: FilterCriteria;
  segment_type: 'static' | 'dynamic' | 'behavioral';
  is_active: boolean;
  member_count: number;
  last_computed_at: string | null;
  properties: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SegmentMembership {
  id: string;
  segment_id: string;
  person_id: string;
  entered_at: string;
  exited_at: string | null;
  properties: Record<string, any>;
}

export interface FilterCriteria {
  // Logical operators
  $and?: FilterCriteria[];
  $or?: FilterCriteria[];
  $not?: FilterCriteria;

  // Direct field comparisons
  [field: string]: any;
}

export interface ComparisonOperator {
  $eq?: any; // Equal
  $ne?: any; // Not equal
  $gt?: number; // Greater than
  $gte?: number; // Greater than or equal
  $lt?: number; // Less than
  $lte?: number; // Less than or equal
  $in?: any[]; // In array
  $nin?: any[]; // Not in array
  $exists?: boolean; // Field exists
}

/**
 * Evaluate if a person matches segment filter criteria
 */
export async function evaluatePersonForSegment(
  personId: string,
  segmentId: string
): Promise<{ matches: boolean; reason?: string }> {
  const supabase = await createClient();

  // Get segment
  const { data: segment, error: segmentError } = await supabase
    .from('segment')
    .select('*')
    .eq('id', segmentId)
    .single();

  if (segmentError || !segment) {
    return {
      matches: false,
      reason: 'Segment not found',
    };
  }

  if (!segment.is_active) {
    return {
      matches: false,
      reason: 'Segment is not active',
    };
  }

  // Get person with features
  const { data: person, error: personError } = await supabase
    .from('person')
    .select(
      `
      *,
      person_features (*)
    `
    )
    .eq('id', personId)
    .single();

  if (personError || !person) {
    return {
      matches: false,
      reason: 'Person not found',
    };
  }

  // Combine person and features for evaluation
  const personData = {
    ...person,
    ...(person.person_features?.[0] || {}),
  };

  // Evaluate filter criteria
  const matches = evaluateFilter(segment.filter_criteria, personData);

  return { matches };
}

/**
 * Recursively evaluate filter criteria against person data
 */
function evaluateFilter(criteria: FilterCriteria, personData: any): boolean {
  // Handle logical operators
  if (criteria.$and) {
    return criteria.$and.every((subCriteria) => evaluateFilter(subCriteria, personData));
  }

  if (criteria.$or) {
    return criteria.$or.some((subCriteria) => evaluateFilter(subCriteria, personData));
  }

  if (criteria.$not) {
    return !evaluateFilter(criteria.$not, personData);
  }

  // Handle field-level filters
  for (const [field, value] of Object.entries(criteria)) {
    // Skip logical operators
    if (field.startsWith('$')) continue;

    const personValue = personData[field];

    // If value is an object with comparison operators
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const matches = evaluateComparison(personValue, value);
      if (!matches) return false;
    } else {
      // Direct equality check
      if (personValue !== value) return false;
    }
  }

  return true;
}

/**
 * Evaluate comparison operators
 */
function evaluateComparison(personValue: any, operator: ComparisonOperator): boolean {
  if ('$eq' in operator) {
    return personValue === operator.$eq;
  }

  if ('$ne' in operator) {
    return personValue !== operator.$ne;
  }

  if ('$gt' in operator) {
    return personValue > operator.$gt!;
  }

  if ('$gte' in operator) {
    return personValue >= operator.$gte!;
  }

  if ('$lt' in operator) {
    return personValue < operator.$lt!;
  }

  if ('$lte' in operator) {
    return personValue <= operator.$lte!;
  }

  if ('$in' in operator) {
    return operator.$in!.includes(personValue);
  }

  if ('$nin' in operator) {
    return !operator.$nin!.includes(personValue);
  }

  if ('$exists' in operator) {
    const exists = personValue !== null && personValue !== undefined;
    return operator.$exists ? exists : !exists;
  }

  // Default: no match
  return false;
}

/**
 * Compute segment membership for all persons
 * This will add/remove persons from segment_membership table
 */
export async function computeSegmentMembership(segmentId: string): Promise<{
  segmentId: string;
  membersAdded: number;
  membersRemoved: number;
  totalMembers: number;
}> {
  const supabase = await createClient();

  // Get segment
  const { data: segment, error: segmentError } = await supabase
    .from('segment')
    .select('*')
    .eq('id', segmentId)
    .single();

  if (segmentError || !segment) {
    throw new Error(`Segment not found: ${segmentId}`);
  }

  // Get all active persons with their features
  const { data: persons, error: personsError } = await supabase
    .from('person')
    .select(
      `
      *,
      person_features (*)
    `
    )
    .order('created_at', { ascending: false });

  if (personsError) {
    throw new Error(`Failed to get persons: ${personsError.message}`);
  }

  // Get current segment members
  const { data: currentMembers } = await supabase
    .from('segment_membership')
    .select('person_id')
    .eq('segment_id', segmentId)
    .is('exited_at', null);

  const currentMemberIds = new Set(currentMembers?.map((m) => m.person_id) || []);

  // Evaluate each person
  const matchingPersonIds: string[] = [];

  for (const person of persons || []) {
    const personData = {
      ...person,
      ...(person.person_features?.[0] || {}),
    };

    const matches = evaluateFilter(segment.filter_criteria, personData);

    if (matches) {
      matchingPersonIds.push(person.id);
    }
  }

  const matchingSet = new Set(matchingPersonIds);

  // Determine who to add and remove
  const toAdd = matchingPersonIds.filter((id) => !currentMemberIds.has(id));
  const toRemove = Array.from(currentMemberIds).filter((id) => !matchingSet.has(id));

  let membersAdded = 0;
  let membersRemoved = 0;

  // Add new members
  if (toAdd.length > 0) {
    const { error: addError } = await supabase.from('segment_membership').insert(
      toAdd.map((personId) => ({
        segment_id: segmentId,
        person_id: personId,
        entered_at: new Date().toISOString(),
      }))
    );

    if (!addError) {
      membersAdded = toAdd.length;
    }

    // TODO: Trigger automation for each person who entered segment
    // await triggerSegmentEntryAutomations(segmentId, toAdd);
  }

  // Remove exited members
  if (toRemove.length > 0) {
    const { error: removeError } = await supabase
      .from('segment_membership')
      .update({ exited_at: new Date().toISOString() })
      .eq('segment_id', segmentId)
      .in('person_id', toRemove)
      .is('exited_at', null);

    if (!removeError) {
      membersRemoved = toRemove.length;
    }

    // TODO: Trigger automation for each person who exited segment
    // await triggerSegmentExitAutomations(segmentId, toRemove);
  }

  // Update segment stats
  const totalMembers = matchingPersonIds.length;

  await supabase
    .from('segment')
    .update({
      member_count: totalMembers,
      last_computed_at: new Date().toISOString(),
    })
    .eq('id', segmentId);

  return {
    segmentId,
    membersAdded,
    membersRemoved,
    totalMembers,
  };
}

/**
 * Get all active members of a segment
 */
export async function getSegmentMembers(
  segmentId: string
): Promise<Array<{ personId: string; enteredAt: string }>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('segment_membership')
    .select('person_id, entered_at')
    .eq('segment_id', segmentId)
    .is('exited_at', null)
    .order('entered_at', { ascending: false });

  if (error) {
    console.error('[SegmentEngine] Failed to get segment members:', error);
    return [];
  }

  return (data || []).map((m) => ({
    personId: m.person_id,
    enteredAt: m.entered_at,
  }));
}

/**
 * Get all segments a person belongs to
 */
export async function getPersonSegments(personId: string): Promise<Segment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('segment_membership')
    .select(
      `
      segment:segment_id (*)
    `
    )
    .eq('person_id', personId)
    .is('exited_at', null);

  if (error) {
    console.error('[SegmentEngine] Failed to get person segments:', error);
    return [];
  }

  return (data || []).map((m: any) => m.segment).filter(Boolean);
}

/**
 * Create a new segment
 */
export async function createSegment(input: {
  segmentName: string;
  segmentKey: string;
  description?: string;
  filterCriteria: FilterCriteria;
  segmentType: 'static' | 'dynamic' | 'behavioral';
  createdBy?: string;
}): Promise<Segment> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('segment')
    .insert({
      segment_name: input.segmentName,
      segment_key: input.segmentKey,
      description: input.description || null,
      filter_criteria: input.filterCriteria,
      segment_type: input.segmentType,
      created_by: input.createdBy || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[SegmentEngine] Failed to create segment:', error);
    throw new Error(`Failed to create segment: ${error.message}`);
  }

  return data;
}

/**
 * Update segment filter criteria
 */
export async function updateSegmentCriteria(
  segmentId: string,
  filterCriteria: FilterCriteria
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('segment')
    .update({
      filter_criteria: filterCriteria,
      updated_at: new Date().toISOString(),
    })
    .eq('id', segmentId);

  if (error) {
    console.error('[SegmentEngine] Failed to update segment criteria:', error);
    throw new Error(`Failed to update segment criteria: ${error.message}`);
  }

  // Recompute membership after criteria change
  await computeSegmentMembership(segmentId);
}

/**
 * Batch compute membership for multiple segments
 * Useful for scheduled jobs
 */
export async function batchComputeSegmentMembership(
  segmentIds?: string[]
): Promise<{
  results: Array<{
    segmentId: string;
    success: boolean;
    error?: string;
    stats?: {
      membersAdded: number;
      membersRemoved: number;
      totalMembers: number;
    };
  }>;
}> {
  const supabase = await createClient();

  let segments: Segment[];

  if (segmentIds && segmentIds.length > 0) {
    // Compute specific segments
    const { data, error } = await supabase
      .from('segment')
      .select('*')
      .in('id', segmentIds)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to get segments: ${error.message}`);
    }

    segments = data || [];
  } else {
    // Compute all active segments
    const { data, error } = await supabase
      .from('segment')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get segments: ${error.message}`);
    }

    segments = data || [];
  }

  const results = [];

  for (const segment of segments) {
    try {
      const stats = await computeSegmentMembership(segment.id);

      results.push({
        segmentId: segment.id,
        success: true,
        stats,
      });

      console.log(
        `[SegmentEngine] Computed membership for segment ${segment.segment_key}: +${stats.membersAdded} -${stats.membersRemoved} (total: ${stats.totalMembers})`
      );
    } catch (error: any) {
      results.push({
        segmentId: segment.id,
        success: false,
        error: error.message,
      });

      console.error(
        `[SegmentEngine] Failed to compute membership for segment ${segment.segment_key}:`,
        error
      );
    }
  }

  return { results };
}

/**
 * Trigger automations for persons entering a segment
 * TODO: Implement automation triggers (Resend, Meta, outbound)
 */
async function triggerSegmentEntryAutomations(
  segmentId: string,
  personIds: string[]
): Promise<void> {
  // Future: Implement automation triggers
  // - Send welcome email via Resend
  // - Add to Meta custom audience
  // - Trigger outbound campaign
  console.log(`[SegmentEngine] TODO: Trigger entry automations for segment ${segmentId}`);
}

/**
 * Trigger automations for persons exiting a segment
 * TODO: Implement automation triggers
 */
async function triggerSegmentExitAutomations(
  segmentId: string,
  personIds: string[]
): Promise<void> {
  // Future: Implement automation triggers
  // - Remove from Meta custom audience
  // - Send re-engagement email
  console.log(`[SegmentEngine] TODO: Trigger exit automations for segment ${segmentId}`);
}
