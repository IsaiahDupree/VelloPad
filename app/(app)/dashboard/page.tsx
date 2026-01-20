import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileCheck, ShoppingCart, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your studio overview — write, preflight, print.
          </p>
        </div>
        <div className="flex gap-2">
          <Button>Create Book</Button>
          <Button variant="secondary">Resume Writing</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Books in Progress</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">+1 from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready to Print</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">1</span>
              <Badge variant="secondary">Preflight clean</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Order a proof copy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders This Month</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">$48.50 total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Writing Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5 days</div>
            <p className="text-xs text-muted-foreground">Keep it going!</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Today&apos;s Next Step</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-medium">Write 250 words in Chapter 2</div>
            <div className="text-sm text-muted-foreground">
              Keep momentum → unlock &quot;proof copy&quot; faster.
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary">Open Editor</Button>
            <Button variant="outline">Get a Prompt</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Books</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { title: "The VelloPad Guide", progress: 62, stage: "Drafting" },
              { title: "30 Day Journal", progress: 18, stage: "Idea" },
              { title: "Mini Cookbook", progress: 91, stage: "Ready to print" },
            ].map((book) => (
              <div key={book.title} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-medium text-sm">{book.title}</div>
                  <div className="text-xs text-muted-foreground">{book.stage}</div>
                </div>
                <div className="w-24">
                  <div className="text-xs text-muted-foreground text-right mb-1">
                    {book.progress}%
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${book.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Marketing Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { task: "Post a 15s TikTok excerpt", done: false },
              { task: "Share launch date on X", done: false },
              { task: "Email 3 potential reviewers", done: true },
            ].map((item) => (
              <div key={item.task} className="flex items-center gap-3">
                <div
                  className={`h-4 w-4 rounded border ${
                    item.done ? "bg-primary border-primary" : "border-muted-foreground"
                  }`}
                />
                <span
                  className={`text-sm ${
                    item.done ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {item.task}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
