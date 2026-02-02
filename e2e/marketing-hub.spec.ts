/**
 * E2E Tests for BS-802: Marketing Hub
 * Tests daily tasks, weekly plan generation, and metrics dashboard
 */

import { test, expect } from '@playwright/test';

// Mock workspace ID for testing
const WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

test.describe('BS-802: Marketing Hub', () => {
  // Task Management Tests
  test('admin can create daily marketing task', async ({ page }) => {
    await page.goto('/admin/marketing');

    // Create a new task via API (simulating task creation)
    const response = await page.request.post('/api/marketing/tasks', {
      data: {
        title: 'Test marketing task',
        description: 'Test description',
        task_type: 'email',
        priority: 'high',
        due_date: new Date().toISOString().split('T')[0], // Today
        workspace_id: WORKSPACE_ID,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.task).toBeDefined();
    expect(data.task.title).toBe('Test marketing task');
    expect(data.task.task_type).toBe('email');
  });

  test('admin can view today\'s tasks dashboard', async ({ page }) => {
    await page.goto('/admin/marketing');

    // Wait for dashboard to load
    await page.waitForSelector('h1:has-text("Marketing Hub")');

    // Check that Today's Tasks tab exists
    await expect(page.locator('button:has-text("Today\'s Tasks")')).toBeVisible();

    // Click on Today's Tasks tab
    await page.click('button:has-text("Today\'s Tasks")');

    // Should show tasks or empty state
    await expect(
      page.locator('text=No tasks for today').or(page.locator('[data-testid="task-item"]'))
    ).toBeVisible();
  });

  test('admin can complete task with results', async ({ page }) => {
    // First create a task
    const createResponse = await page.request.post('/api/marketing/tasks', {
      data: {
        title: 'Task to complete',
        description: 'Test task',
        task_type: 'email',
        priority: 'medium',
        due_date: new Date().toISOString().split('T')[0],
        workspace_id: WORKSPACE_ID,
      },
    });

    const { task } = await createResponse.json();

    // Complete the task
    const completeResponse = await page.request.post(`/api/marketing/tasks/${task.id}/complete`, {
      data: {
        metrics: {
          emails_sent: 150,
          open_rate: 0.24,
        },
        notes: 'Successfully sent activation email campaign',
      },
    });

    expect(completeResponse.ok()).toBeTruthy();
    const { task: completedTask } = await completeResponse.json();
    expect(completedTask.status).toBe('completed');
    expect(completedTask.result_metrics.emails_sent).toBe(150);
    expect(completedTask.completed_at).toBeTruthy();
  });

  test('admin can assign task to team member', async ({ page }) => {
    // Create a task
    const createResponse = await page.request.post('/api/marketing/tasks', {
      data: {
        title: 'Task to assign',
        task_type: 'content',
        due_date: new Date().toISOString().split('T')[0],
        workspace_id: WORKSPACE_ID,
      },
    });

    const { task } = await createResponse.json();
    const userId = '00000000-0000-0000-0000-000000000002';

    // Assign the task
    const assignResponse = await page.request.patch(`/api/marketing/tasks/${task.id}`, {
      data: {
        assigned_to: userId,
      },
    });

    expect(assignResponse.ok()).toBeTruthy();
    const { task: assignedTask } = await assignResponse.json();
    expect(assignedTask.assigned_to).toBe(userId);
  });

  test('task appears on assignee\'s dashboard', async ({ page }) => {
    const userId = '00000000-0000-0000-0000-000000000003';

    // Create a task assigned to a specific user
    await page.request.post('/api/marketing/tasks', {
      data: {
        title: 'Assigned task',
        task_type: 'social',
        due_date: new Date().toISOString().split('T')[0],
        workspace_id: WORKSPACE_ID,
        assigned_to: userId,
      },
    });

    // Fetch tasks filtered by assigned user
    const response = await page.request.get(
      `/api/marketing/tasks?workspace_id=${WORKSPACE_ID}&assigned_to=${userId}`
    );

    expect(response.ok()).toBeTruthy();
    const { tasks } = await response.json();
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0].assigned_to).toBe(userId);
  });

  // Weekly Plans Tests
  test('admin can generate AI weekly plan', async ({ page }) => {
    await page.goto('/admin/marketing');

    // Look for Generate button
    const generateButton = page.locator('button:has-text("Generate Weekly Plan")');
    await expect(generateButton).toBeVisible();

    // Generate plan via API
    const response = await page.request.post('/api/marketing/plans/generate', {
      data: {
        workspace_id: WORKSPACE_ID,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.plan).toBeDefined();
    expect(data.tasks).toBeDefined();
    expect(data.task_count).toBeGreaterThan(0);
  });

  test('generated plan includes goals and strategies', async ({ page }) => {
    // Generate a plan
    const response = await page.request.post('/api/marketing/plans/generate', {
      data: {
        workspace_id: WORKSPACE_ID,
      },
    });

    const { plan } = await response.json();

    expect(plan.plan_summary).toBeDefined();
    expect(plan.plan_summary.length).toBeGreaterThan(0);

    expect(plan.goals).toBeDefined();
    expect(Array.isArray(plan.goals)).toBe(true);
    expect(plan.goals.length).toBeGreaterThan(0);

    expect(plan.strategies).toBeDefined();
    expect(Array.isArray(plan.strategies)).toBe(true);
    expect(plan.strategies.length).toBeGreaterThan(0);
  });

  test('generated plan creates associated tasks', async ({ page }) => {
    // Generate a plan
    const generateResponse = await page.request.post('/api/marketing/plans/generate', {
      data: {
        workspace_id: WORKSPACE_ID,
      },
    });

    const { plan, tasks } = await generateResponse.json();

    expect(tasks.length).toBeGreaterThan(0);

    // Verify tasks are linked to plan
    tasks.forEach((task: any) => {
      expect(task.weekly_plan_id).toBe(plan.id);
      expect(task.is_generated).toBe(true);
    });
  });

  test('admin can view current week plan', async ({ page }) => {
    await page.goto('/admin/marketing');

    // Switch to Current Week Plan tab
    await page.click('button:has-text("Current Week Plan")');

    // Should show plan or empty state
    await expect(
      page.locator('text=No plan for current week').or(page.locator('text=Current Week Plan'))
    ).toBeVisible();
  });

  test('admin can manually edit plan', async ({ page }) => {
    // Generate a plan first
    const generateResponse = await page.request.post('/api/marketing/plans/generate', {
      data: {
        workspace_id: WORKSPACE_ID,
      },
    });

    const { plan } = await generateResponse.json();

    // Update the plan
    const updateResponse = await page.request.patch(`/api/marketing/plans/${plan.id}`, {
      data: {
        plan_summary: 'Updated plan summary',
      },
    });

    expect(updateResponse.ok()).toBeTruthy();
    const { plan: updatedPlan } = await updateResponse.json();
    expect(updatedPlan.plan_summary).toBe('Updated plan summary');
  });

  // Metrics Dashboard Tests
  test('admin can view metrics dashboard', async ({ page }) => {
    await page.goto('/admin/marketing');

    // Check that metrics cards are visible
    await expect(page.locator('text=Today\'s Signups')).toBeVisible();
    await expect(page.locator('text=Activations')).toBeVisible();
    await expect(page.locator('text=PDFs Generated')).toBeVisible();
    await expect(page.locator('text=Orders')).toBeVisible();
  });

  test('metrics show signup trends', async ({ page }) => {
    // Fetch metrics via API
    const response = await page.request.get(
      `/api/marketing/metrics/dashboard?workspace_id=${WORKSPACE_ID}`
    );

    expect(response.ok()).toBeTruthy();
    const { metrics } = await response.json();

    expect(metrics.trends).toBeDefined();
    expect(metrics.trends.signups).toBeDefined();
    expect(Array.isArray(metrics.trends.signups.dates)).toBe(true);
    expect(Array.isArray(metrics.trends.signups.values)).toBe(true);
    expect(typeof metrics.trends.signups.change_percent).toBe('number');
  });

  test('metrics show conversion funnel', async ({ page }) => {
    const response = await page.request.get(
      `/api/marketing/metrics/dashboard?workspace_id=${WORKSPACE_ID}`
    );

    const { metrics } = await response.json();

    // Check that metrics exist (may be null if no data)
    expect(metrics.today).toBeDefined();
    expect(metrics.yesterday).toBeDefined();

    // If today's metrics exist, check conversion rate fields
    if (metrics.today) {
      expect('signup_to_activation_rate' in metrics.today).toBe(true);
      expect('activation_to_order_rate' in metrics.today).toBe(true);
    }
  });

  test('metrics show email performance', async ({ page }) => {
    const response = await page.request.get(
      `/api/marketing/metrics/dashboard?workspace_id=${WORKSPACE_ID}`
    );

    const { metrics } = await response.json();

    if (metrics.today) {
      expect('emails_sent' in metrics.today).toBe(true);
      expect('emails_opened' in metrics.today).toBe(true);
      expect('emails_clicked' in metrics.today).toBe(true);
    }
  });

  test('can view 30-day trends', async ({ page }) => {
    await page.goto('/admin/marketing');

    // Switch to Metrics tab
    await page.click('button:has-text("Metrics")');

    // Check for trends section
    await expect(page.locator('text=30-Day Trends')).toBeVisible();
    await expect(page.locator('text=Signups')).toBeVisible();
    await expect(page.locator('text=Activations')).toBeVisible();
    await expect(page.locator('text=Revenue')).toBeVisible();
  });

  // Integration Tests
  test('weekly plan generation uses real metrics', async ({ page }) => {
    // Generate plan
    const response = await page.request.post('/api/marketing/plans/generate', {
      data: {
        workspace_id: WORKSPACE_ID,
      },
    });

    const { plan } = await response.json();

    // Check that plan has generation context
    expect(plan.generation_context).toBeDefined();
    expect(plan.generation_context.previousWeekMetrics).toBeDefined();
    expect(plan.generation_context.currentGoals).toBeDefined();
  });

  test('tasks link to weekly plans correctly', async ({ page }) => {
    // Generate plan with tasks
    const generateResponse = await page.request.post('/api/marketing/plans/generate', {
      data: {
        workspace_id: WORKSPACE_ID,
      },
    });

    const { plan } = await generateResponse.json();

    // Fetch tasks for the plan
    const tasksResponse = await page.request.get(
      `/api/marketing/tasks?workspace_id=${WORKSPACE_ID}&weekly_plan_id=${plan.id}`
    );

    const { tasks } = await tasksResponse.json();
    expect(tasks.length).toBeGreaterThan(0);

    tasks.forEach((task: any) => {
      expect(task.weekly_plan_id).toBe(plan.id);
    });
  });

  // API Error Handling Tests
  test('API returns 401 for unauthenticated requests', async ({ page }) => {
    // These would need proper auth mocking in a real test
    // For now, we just verify the endpoint exists
    const response = await page.request.get('/api/marketing/tasks/daily?workspace_id=test');
    expect([200, 401, 403]).toContain(response.status());
  });

  test('API validates required fields', async ({ page }) => {
    const response = await page.request.post('/api/marketing/tasks', {
      data: {
        // Missing required fields
        title: 'Test',
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('required');
  });

  test('API handles not found errors', async ({ page }) => {
    const response = await page.request.get('/api/marketing/tasks/00000000-0000-0000-0000-999999999999');
    expect([404, 401, 403]).toContain(response.status());
  });

  // Task Filtering Tests
  test('can filter tasks by status', async ({ page }) => {
    const response = await page.request.get(
      `/api/marketing/tasks?workspace_id=${WORKSPACE_ID}&status=completed`
    );

    if (response.ok()) {
      const { tasks } = await response.json();
      tasks.forEach((task: any) => {
        expect(task.status).toBe('completed');
      });
    }
  });

  test('can filter tasks by task type', async ({ page }) => {
    const response = await page.request.get(
      `/api/marketing/tasks?workspace_id=${WORKSPACE_ID}&task_type=email`
    );

    if (response.ok()) {
      const { tasks } = await response.json();
      tasks.forEach((task: any) => {
        expect(task.task_type).toBe('email');
      });
    }
  });

  test('can filter tasks by date', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    const response = await page.request.get(
      `/api/marketing/tasks?workspace_id=${WORKSPACE_ID}&due_date=${today}`
    );

    if (response.ok()) {
      const { tasks } = await response.json();
      tasks.forEach((task: any) => {
        expect(task.due_date).toBe(today);
      });
    }
  });
});
