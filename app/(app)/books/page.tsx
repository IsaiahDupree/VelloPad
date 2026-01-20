import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

const demoBooks = [
  { id: "bk_1", title: "The VelloPad Guide", progress: 62, stage: "drafting", chapters: 8 },
  { id: "bk_2", title: "30 Day Journal", progress: 18, stage: "idea", chapters: 3 },
  { id: "bk_3", title: "Mini Cookbook", progress: 91, stage: "ready_to_print", chapters: 12 },
];

const stageLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  idea: { label: "Idea", variant: "outline" },
  drafting: { label: "Drafting", variant: "secondary" },
  editing: { label: "Editing", variant: "secondary" },
  ready_to_print: { label: "Ready to Print", variant: "default" },
};

export default function BooksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Books</h1>
          <p className="text-sm text-muted-foreground">
            Create → Edit → Preflight → Print
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Book
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a New Book</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Book Title</label>
                <Input placeholder="My Amazing Book" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Genre (optional)</label>
                <Input placeholder="Business, Cookbook, Journal..." />
              </div>
              <Button className="w-full">Continue to Editor</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {demoBooks.map((book) => {
          const stage = stageLabels[book.stage] || stageLabels.idea;
          return (
            <Link key={book.id} href={`/books/${book.id}`}>
              <Card className="hover:shadow-md transition cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{book.title}</CardTitle>
                    <Badge variant={stage.variant}>{stage.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    {book.chapters} chapters
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{book.progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${book.progress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
