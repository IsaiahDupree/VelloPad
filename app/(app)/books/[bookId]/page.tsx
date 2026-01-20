import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Eye,
  Upload,
  Sparkles,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function BookDetailPage({
  params,
}: {
  params: { bookId: string };
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            The VelloPad Guide
          </h1>
          <p className="text-sm text-muted-foreground">
            Book ID: {params.bookId} • 8 chapters • 62% complete
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button variant="secondary">Generate Print PDF</Button>
          <Button>Order Proof Copy</Button>
        </div>
      </div>

      <Tabs defaultValue="write" className="space-y-4">
        <TabsList>
          <TabsTrigger value="write" className="gap-2">
            <FileText className="h-4 w-4" />
            Write
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="publish" className="gap-2">
            <Upload className="h-4 w-4" />
            Publish
          </TabsTrigger>
        </TabsList>

        <TabsContent value="write" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-4">
            {/* Chapter List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm">Chapters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { num: 1, title: "Introduction", words: 1200 },
                  { num: 2, title: "Getting Started", words: 850 },
                  { num: 3, title: "Core Concepts", words: 0 },
                  { num: 4, title: "Advanced Topics", words: 0 },
                ].map((ch) => (
                  <div
                    key={ch.num}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {ch.num}. {ch.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {ch.words} words
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" className="w-full mt-2" size="sm">
                  + Add Chapter
                </Button>
              </CardContent>
            </Card>

            {/* Editor */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm">
                  Chapter 2: Getting Started
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Start writing your chapter here..."
                  className="min-h-[400px] resize-none"
                  defaultValue="Welcome to VelloPad! This guide will walk you through everything you need to know to create, edit, and print your own book.

In this chapter, we'll cover the basics of setting up your first book project and getting familiar with the editor interface."
                />
                <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
                  <span>850 words</span>
                  <span>Auto-saved just now</span>
                </div>
              </CardContent>
            </Card>

            {/* AI Sidekick */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Prompt Sidekick
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Generate chapter outline
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Rewrite selection
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Expand this paragraph
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Fix grammar & style
                </Button>
                <div className="pt-4 border-t">
                  <div className="text-xs font-medium mb-2">Next Step</div>
                  <p className="text-xs text-muted-foreground">
                    Finish Chapter 2 to unlock the preview feature. You&apos;re 85% there!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Book Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-[3/4] max-w-md mx-auto bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">
                  PDF preview will render here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="publish" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Publish Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "All chapters complete", done: false },
                { label: "Cover uploaded", done: true },
                { label: "Preflight check passed", done: false },
                { label: "Trim size selected", done: true },
                { label: "Binding type chosen", done: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  {item.done ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span
                    className={item.done ? "text-muted-foreground" : "font-medium"}
                  >
                    {item.label}
                  </span>
                  {item.done && (
                    <Badge variant="secondary" className="ml-auto">
                      Done
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Print Settings</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Trim Size</div>
                <div className="font-medium">6&quot; × 9&quot;</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Binding</div>
                <div className="font-medium">Softcover</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Paper</div>
                <div className="font-medium">White, 60lb</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
