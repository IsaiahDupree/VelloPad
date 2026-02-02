// Weekly Marketing Plan Generator
// AI-powered service that analyzes metrics and generates weekly marketing plans

import Anthropic from '@anthropic-ai/sdk';
import type {
  WeeklyPlan,
  WeeklyPlanContext,
  GeneratedWeeklyPlan,
  CreateTaskParams,
  Goal,
  Strategy,
} from './types';
import { computeWeeklyMetrics } from './metrics-service';

/**
 * Build context for weekly plan generation
 */
export async function buildWeeklyPlanContext(
  workspaceId: string
): Promise<WeeklyPlanContext> {
  // Get last week's metrics
  const lastWeekStart = new Date();
  const dayOfWeek = lastWeekStart.getDay() || 7;
  lastWeekStart.setDate(lastWeekStart.getDate() - (dayOfWeek - 1) - 7); // Last Monday

  const previousWeekMetrics = await computeWeeklyMetrics(workspaceId, lastWeekStart);

  // Default goals (would be customizable in production)
  const currentGoals: Goal[] = [
    {
      metric: 'signups',
      target: 50,
      current: previousWeekMetrics.new_signups,
      unit: 'users',
      description: 'New user signups',
    },
    {
      metric: 'activations',
      target: 20,
      current: previousWeekMetrics.activated_users,
      unit: 'users',
      description: 'Users who created their first book',
    },
    {
      metric: 'orders',
      target: 10,
      current: previousWeekMetrics.orders_placed,
      unit: 'orders',
      description: 'Print orders placed',
    },
  ];

  return {
    previousWeekMetrics,
    currentGoals,
    workspace_id: workspaceId,
  };
}

/**
 * Generate weekly marketing plan using AI
 */
export async function generateWeeklyPlan(
  context: WeeklyPlanContext
): Promise<GeneratedWeeklyPlan> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('No AI API key configured, using mock plan generator');
    return generateMockWeeklyPlan(context);
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return generateWeeklyPlanWithClaude(context);
  } else {
    return generateWeeklyPlanWithOpenAI(context);
  }
}

/**
 * Generate weekly plan using Claude (Anthropic)
 */
async function generateWeeklyPlanWithClaude(
  context: WeeklyPlanContext
): Promise<GeneratedWeeklyPlan> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const systemPrompt = `You are a marketing strategist for VelloPad, a modern book creation platform.
Your role is to analyze performance metrics and generate actionable weekly marketing plans.

VelloPad helps users:
- Write and edit books with rich text editor
- Design professional covers
- Generate print-ready PDFs
- Order physical copies via print-on-demand

Key metrics to optimize:
1. Signups: New user registrations
2. Activations: Users who create their first book/chapter
3. Engagement: Writing sessions and word count
4. Conversions: PDF generation and print orders
5. Retention: Return visits and continued writing

Your output must be valid JSON matching this structure:
{
  "summary": "2-3 sentence overview of the week's strategy",
  "goals": [
    {"metric": "signups", "target": 50, "description": "..."}
  ],
  "strategies": [
    {"name": "Strategy Name", "description": "...", "priority": 1}
  ],
  "tasks": [
    {
      "title": "Task title",
      "description": "Detailed task description",
      "task_type": "email|content|social|seo|analytics|campaign",
      "priority": "low|medium|high|urgent",
      "due_date": "YYYY-MM-DD"
    }
  ]
}`;

  const userPrompt = buildPrompt(context);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    return parseAIResponse(responseText, context);
  } catch (error) {
    console.error('Failed to generate plan with Claude:', error);
    console.warn('Falling back to mock plan generator');
    return generateMockWeeklyPlan(context);
  }
}

/**
 * Generate weekly plan using OpenAI
 */
async function generateWeeklyPlanWithOpenAI(
  context: WeeklyPlanContext
): Promise<GeneratedWeeklyPlan> {
  // TODO: Implement OpenAI integration
  console.warn('OpenAI integration not yet implemented, using mock generator');
  return generateMockWeeklyPlan(context);
}

/**
 * Build the prompt for AI generation
 */
function buildPrompt(context: WeeklyPlanContext): string {
  const { previousWeekMetrics, currentGoals } = context;

  return `Generate a weekly marketing plan for VelloPad based on the following data:

PREVIOUS WEEK PERFORMANCE:
- New Signups: ${previousWeekMetrics?.new_signups || 0}
- Activated Users: ${previousWeekMetrics?.activated_users || 0}
- Books Created: ${previousWeekMetrics?.books_created || 0}
- PDFs Generated: ${previousWeekMetrics?.pdfs_generated || 0}
- Orders Placed: ${previousWeekMetrics?.orders_placed || 0}
- Revenue: $${((previousWeekMetrics?.revenue_cents || 0) / 100).toFixed(2)}
- Email Sent: ${previousWeekMetrics?.emails_sent || 0}
- Email Open Rate: ${previousWeekMetrics && previousWeekMetrics.emails_sent > 0 ? ((previousWeekMetrics.emails_opened / previousWeekMetrics.emails_sent) * 100).toFixed(1) : 0}%
- Signup to Activation Rate: ${previousWeekMetrics?.signup_to_activation_rate?.toFixed(1) || 0}%

CURRENT GOALS:
${currentGoals.map((g) => `- ${g.description}: ${g.current} current, ${g.target} target`).join('\n')}

Generate a comprehensive weekly marketing plan with:
1. A concise summary (2-3 sentences) focusing on the week's strategic priorities
2. 3-5 specific, measurable goals
3. 3-5 high-level strategies to achieve those goals
4. 10-15 daily tasks across categories: email, content, social, seo, analytics, campaign

Tasks should be:
- Specific and actionable
- Distributed across Monday-Sunday
- Balanced across different marketing channels
- Realistic given a small team

Output format: Valid JSON only, no markdown or extra text.`;
}

/**
 * Parse AI response into structured plan
 */
function parseAIResponse(response: string, context: WeeklyPlanContext): GeneratedWeeklyPlan {
  try {
    // Extract JSON from response (in case it's wrapped in markdown)
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    // Get upcoming week dates
    const nextMonday = new Date();
    const dayOfWeek = nextMonday.getDay() || 7;
    nextMonday.setDate(nextMonday.getDate() + (8 - dayOfWeek)); // Next Monday
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextSunday.getDate() + 6);

    const plan: WeeklyPlan = {
      id: '', // Will be set by database
      week_start_date: nextMonday.toISOString().split('T')[0],
      week_end_date: nextSunday.toISOString().split('T')[0],
      plan_summary: parsed.summary,
      goals: parsed.goals,
      strategies: parsed.strategies,
      workspace_id: context.workspace_id,
      generated_by: 'ai',
      generation_context: context,
      status: 'draft',
      approved_by: null,
      approved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const tasks: CreateTaskParams[] = parsed.tasks.map((task: any) => ({
      title: task.title,
      description: task.description,
      task_type: task.task_type,
      priority: task.priority || 'medium',
      due_date: task.due_date,
      workspace_id: context.workspace_id,
      is_generated: true,
    }));

    return { plan, tasks };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.warn('Falling back to mock plan generator');
    return generateMockWeeklyPlan(context);
  }
}

/**
 * Generate a mock weekly plan (fallback when AI is unavailable)
 */
function generateMockWeeklyPlan(context: WeeklyPlanContext): GeneratedWeeklyPlan {
  const { previousWeekMetrics, currentGoals, workspace_id } = context;

  // Get upcoming week dates
  const nextMonday = new Date();
  const dayOfWeek = nextMonday.getDay() || 7;
  nextMonday.setDate(nextMonday.getDate() + (8 - dayOfWeek)); // Next Monday
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextSunday.getDate() + 6);

  const plan: WeeklyPlan = {
    id: '',
    week_start_date: nextMonday.toISOString().split('T')[0],
    week_end_date: nextSunday.toISOString().split('T')[0],
    plan_summary: `Focus on user acquisition and activation. Last week saw ${previousWeekMetrics?.new_signups || 0} signups and ${previousWeekMetrics?.activated_users || 0} activations. This week, we'll double down on email campaigns, content marketing, and social engagement to reach our targets.`,
    goals: [
      {
        metric: 'signups',
        target: Math.max((previousWeekMetrics?.new_signups || 25) * 1.2, 30),
        current: previousWeekMetrics?.new_signups || 0,
        unit: 'users',
        description: 'Increase new user signups by 20%',
      },
      {
        metric: 'activations',
        target: Math.max((previousWeekMetrics?.activated_users || 10) * 1.5, 15),
        current: previousWeekMetrics?.activated_users || 0,
        unit: 'users',
        description: 'Boost activation rate with onboarding improvements',
      },
      {
        metric: 'email_engagement',
        target: 25,
        current: previousWeekMetrics?.emails_sent || 0,
        unit: 'percent',
        description: 'Achieve 25% email open rate',
      },
    ],
    strategies: [
      {
        name: 'Activation Email Series',
        description:
          'Launch 3-part email series for new signups to guide them through creating their first book',
        priority: 1,
        category: 'email',
      },
      {
        name: 'Content Marketing Push',
        description:
          'Publish 2 SEO-optimized blog posts targeting "self-publishing" and "book formatting" keywords',
        priority: 2,
        category: 'content',
      },
      {
        name: 'Social Media Engagement',
        description:
          'Daily posts on Twitter/LinkedIn showcasing user success stories and writing tips',
        priority: 3,
        category: 'social',
      },
    ],
    workspace_id,
    generated_by: 'ai',
    generation_context: context,
    status: 'draft',
    approved_by: null,
    approved_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Generate tasks for each day of the week
  const tasks: CreateTaskParams[] = [];
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  daysOfWeek.forEach((day, index) => {
    const taskDate = new Date(nextMonday);
    taskDate.setDate(taskDate.getDate() + index);
    const dateStr = taskDate.toISOString().split('T')[0];

    if (index === 0) {
      // Monday
      tasks.push(
        {
          title: 'Send activation email to new signups',
          description: 'Part 1: Welcome + guide to creating first book',
          task_type: 'email',
          priority: 'high',
          due_date: dateStr,
          workspace_id,
          is_generated: true,
        },
        {
          title: 'Review last week\'s analytics',
          description: 'Analyze conversion funnel, identify drop-off points',
          task_type: 'analytics',
          priority: 'medium',
          due_date: dateStr,
          workspace_id,
          is_generated: true,
        }
      );
    } else if (index === 1) {
      // Tuesday
      tasks.push(
        {
          title: 'Publish SEO blog post: "How to Format a Book for Print"',
          description: 'Target keywords: book formatting, print-ready PDF',
          task_type: 'content',
          priority: 'high',
          due_date: dateStr,
          workspace_id,
          is_generated: true,
        },
        {
          title: 'Create social media content calendar',
          description: 'Plan posts for the week across Twitter, LinkedIn',
          task_type: 'social',
          priority: 'medium',
          due_date: dateStr,
          workspace_id,
          is_generated: true,
        }
      );
    } else if (index === 2) {
      // Wednesday
      tasks.push(
        {
          title: 'Send activation email part 2',
          description: 'Tips for writing effectively + chapter organization',
          task_type: 'email',
          priority: 'high',
          due_date: dateStr,
          workspace_id,
          is_generated: true,
        },
        {
          title: 'Engage with writing community on Twitter',
          description: 'Reply to #WritingCommunity posts, share tips',
          task_type: 'social',
          priority: 'low',
          due_date: dateStr,
          workspace_id,
          is_generated: true,
        }
      );
    } else if (index === 3) {
      // Thursday
      tasks.push(
        {
          title: 'Publish SEO blog post: "Self-Publishing Guide 2026"',
          description: 'Target keywords: self-publishing, publish a book',
          task_type: 'content',
          priority: 'high',
          due_date: dateStr,
          workspace_id,
          is_generated: true,
        },
        {
          title: 'A/B test email subject lines',
          description: 'Test 2 variations for activation email series',
          task_type: 'email',
          priority: 'medium',
          due_date: dateStr,
          workspace_id,
          is_generated: true,
        }
      );
    } else if (index === 4) {
      // Friday
      tasks.push(
        {
          title: 'Send activation email part 3',
          description: 'Cover design tips + PDF generation walkthrough',
          task_type: 'email',
          priority: 'high',
          due_date: dateStr,
          workspace_id,
          is_generated: true,
        },
        {
          title: 'Weekly metrics report',
          description: 'Compile key metrics, identify wins and improvements',
          task_type: 'analytics',
          priority: 'medium',
          due_date: dateStr,
          workspace_id,
          is_generated: true,
        }
      );
    }
  });

  return { plan, tasks };
}
