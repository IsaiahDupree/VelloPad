// Marketing Hub Dashboard
// Admin page for marketing tasks, weekly plans, and metrics

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle2,
  Circle,
  Clock,
  TrendingUp,
  Users,
  FileText,
  ShoppingCart,
  Sparkles,
  BarChart3
} from 'lucide-react';
import type { MarketingTask, WeeklyPlan, DashboardMetrics } from '@/lib/marketing/types';

// Mock workspace ID (in production, get from session)
const WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

export default function MarketingHubPage() {
  const [todayTasks, setTodayTasks] = useState<MarketingTask[]>([]);
  const [currentPlan, setCurrentPlan] = useState<WeeklyPlan | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);

      // Load today's tasks
      const tasksRes = await fetch(`/api/marketing/tasks/daily?workspace_id=${WORKSPACE_ID}`);
      const tasksData = await tasksRes.json();
      setTodayTasks(tasksData.tasks || []);

      // Load current week's plan
      const planRes = await fetch(`/api/marketing/plans/current?workspace_id=${WORKSPACE_ID}`);
      const planData = await planRes.json();
      setCurrentPlan(planData.plan);

      // Load dashboard metrics
      const metricsRes = await fetch(`/api/marketing/metrics/dashboard?workspace_id=${WORKSPACE_ID}`);
      const metricsData = await metricsRes.json();
      setMetrics(metricsData.metrics);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function generateWeeklyPlan() {
    try {
      setGenerating(true);
      const res = await fetch('/api/marketing/plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: WORKSPACE_ID }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`Weekly plan generated successfully! Created ${data.task_count} tasks.`);
        await loadDashboardData();
      } else {
        alert(`Failed to generate plan: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to generate weekly plan:', error);
      alert('Failed to generate weekly plan');
    } finally {
      setGenerating(false);
    }
  }

  async function completeTask(taskId: string) {
    try {
      const res = await fetch(`/api/marketing/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: { completed: true },
          notes: 'Completed via dashboard',
        }),
      });

      if (res.ok) {
        await loadDashboardData();
      }
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading Marketing Hub...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Hub</h1>
          <p className="text-muted-foreground">
            Daily tasks, weekly plans, and performance metrics
          </p>
        </div>
        <Button onClick={generateWeeklyPlan} disabled={generating}>
          <Sparkles className="mr-2 h-4 w-4" />
          {generating ? 'Generating...' : 'Generate Weekly Plan'}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Signups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.today?.new_signups || 0}</div>
            <p className="text-xs text-muted-foreground">
              Yesterday: {metrics?.yesterday?.new_signups || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activations</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.today?.activated_users || 0}</div>
            <p className="text-xs text-muted-foreground">
              Yesterday: {metrics?.yesterday?.activated_users || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PDFs Generated</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.today?.pdfs_generated || 0}</div>
            <p className="text-xs text-muted-foreground">
              Yesterday: {metrics?.yesterday?.pdfs_generated || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.today?.orders_placed || 0}</div>
            <p className="text-xs text-muted-foreground">
              Yesterday: {metrics?.yesterday?.orders_placed || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">Today's Tasks ({todayTasks.length})</TabsTrigger>
          <TabsTrigger value="plan">Current Week Plan</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Marketing Tasks</CardTitle>
              <CardDescription>
                {todayTasks.length === 0
                  ? 'No tasks scheduled for today'
                  : `${todayTasks.filter((t) => t.status === 'completed').length} / ${todayTasks.length} completed`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="mx-auto h-12 w-12 mb-2 opacity-50" />
                  <p>No tasks for today. Generate a weekly plan to get started!</p>
                </div>
              ) : (
                todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <button
                      onClick={() => completeTask(task.id)}
                      disabled={task.status === 'completed'}
                      className="mt-0.5"
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </h4>
                        <Badge variant="outline">{task.task_type}</Badge>
                        <Badge variant={task.priority === 'high' || task.priority === 'urgent' ? 'destructive' : 'secondary'}>
                          {task.priority}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan" className="space-y-4">
          {currentPlan ? (
            <Card>
              <CardHeader>
                <CardTitle>Current Week Plan</CardTitle>
                <CardDescription>
                  Week of {new Date(currentPlan.week_start_date).toLocaleDateString()} -{' '}
                  {new Date(currentPlan.week_end_date).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <p className="text-sm text-muted-foreground">{currentPlan.plan_summary}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Goals</h3>
                  <div className="space-y-2">
                    {currentPlan.goals.map((goal: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded">
                        <span className="font-medium">{goal.description || goal.metric}</span>
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {goal.current} / {goal.target} {goal.unit}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {goal.current > 0 ? Math.round((goal.current / goal.target) * 100) : 0}% complete
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Strategies</h3>
                  <div className="space-y-2">
                    {currentPlan.strategies.map((strategy: any, i: number) => (
                      <div key={i} className="p-3 border rounded">
                        <h4 className="font-medium">{strategy.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{strategy.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="mx-auto h-12 w-12 mb-2 opacity-50" />
                  <p className="mb-4">No plan for current week</p>
                  <Button onClick={generateWeeklyPlan} disabled={generating}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Weekly Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>30-Day Trends</CardTitle>
              <CardDescription>Performance trends over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Signups</h3>
                  <div className="flex items-center gap-2">
                    <TrendingUp className={`h-4 w-4 ${(metrics?.trends.signups.change_percent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    <span className="text-sm font-semibold">
                      {(metrics?.trends.signups.change_percent || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Total: {metrics?.trends.signups.values.reduce((a, b) => a + b, 0) || 0}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Activations</h3>
                  <div className="flex items-center gap-2">
                    <TrendingUp className={`h-4 w-4 ${(metrics?.trends.activations.change_percent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    <span className="text-sm font-semibold">
                      {(metrics?.trends.activations.change_percent || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Total: {metrics?.trends.activations.values.reduce((a, b) => a + b, 0) || 0}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Revenue</h3>
                  <div className="flex items-center gap-2">
                    <TrendingUp className={`h-4 w-4 ${(metrics?.trends.revenue.change_percent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    <span className="text-sm font-semibold">
                      {(metrics?.trends.revenue.change_percent || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Total: ${(metrics?.trends.revenue.values.reduce((a, b) => a + b, 0) || 0).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
