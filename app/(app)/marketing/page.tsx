import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Calendar, TrendingUp, CheckCircle } from "lucide-react";

export default function MarketingPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Marketing Hub</h1>
          <p className="text-sm text-muted-foreground">
            Plan, track, and execute your book launch
          </p>
        </div>
        <Button>Generate Marketing Plan</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Complete</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3 / 12</div>
            <p className="text-xs text-muted-foreground">25% done</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days to Launch</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14</div>
            <p className="text-xs text-muted-foreground">Feb 1, 2026</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email List</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127</div>
            <p className="text-xs text-muted-foreground">+8 this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pre-orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">$288 revenue</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pre-Launch Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { task: "Create landing page", done: true, priority: "high" },
                { task: "Set up email capture", done: true, priority: "high" },
                { task: "Write 5 social posts", done: false, priority: "medium" },
                { task: "Record 30s book trailer", done: false, priority: "medium" },
                { task: "Reach out to 10 reviewers", done: true, priority: "high" },
                { task: "Schedule AMA/live event", done: false, priority: "low" },
              ].map((item) => (
                <div key={item.task} className="flex items-center gap-3">
                  <div
                    className={`h-4 w-4 rounded border ${
                      item.done ? "bg-primary border-primary" : "border-muted-foreground"
                    }`}
                  />
                  <span className={item.done ? "line-through text-muted-foreground" : ""}>
                    {item.task}
                  </span>
                  <Badge
                    variant={item.priority === "high" ? "default" : "secondary"}
                    className="ml-auto"
                  >
                    {item.priority}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Launch Week Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { task: "Send launch email blast", done: false },
                { task: "Post on all social channels", done: false },
                { task: "Run limited discount promo", done: false },
                { task: "Engage with early readers", done: false },
              ].map((item) => (
                <div key={item.task} className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded border border-muted-foreground" />
                  <span>{item.task}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Upcoming Milestones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { date: "Jan 20", event: "ARC copies sent", status: "upcoming" },
                { date: "Jan 25", event: "Pre-order opens", status: "upcoming" },
                { date: "Feb 1", event: "Official launch day", status: "upcoming" },
                { date: "Feb 7", event: "Launch week ends", status: "upcoming" },
              ].map((item) => (
                <div key={item.event} className="flex items-center gap-4">
                  <div className="w-16 text-sm font-medium">{item.date}</div>
                  <div className="flex-1">{item.event}</div>
                  <Badge variant="outline">{item.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audience" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Audience Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Chart placeholder — email signups over time
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
