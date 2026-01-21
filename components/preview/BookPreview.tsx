'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Eye,
  FileText,
  Download,
  Printer,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface Chapter {
  id: string;
  title: string;
  content: any;
  word_count: number;
  position: number;
}

interface Book {
  id: string;
  title: string;
  subtitle?: string;
  author?: string;
  genre?: string;
  trim_size?: string;
  binding?: string;
  word_count: number;
  page_count: number;
}

interface BookPreviewProps {
  book: Book;
  chapters: Chapter[];
}

type PreviewMode = 'fast' | 'print';

export function BookPreview({ book, chapters }: BookPreviewProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('fast');
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isGenerating, setIsGenerating] = useState(false);
  const [printPreviewUrl, setPrintPreviewUrl] = useState<string | null>(null);
  const [previewPages, setPreviewPages] = useState<any[]>([]);

  // Generate fast preview from chapter content
  useEffect(() => {
    const pages = generateFastPreview(book, chapters);
    setPreviewPages(pages);
  }, [book, chapters]);

  const generateFastPreview = (book: Book, chapters: Chapter[]) => {
    const pages: any[] = [];

    // Title page
    pages.push({
      type: 'title',
      content: {
        title: book.title,
        subtitle: book.subtitle,
        author: book.author,
      }
    });

    // Table of contents
    pages.push({
      type: 'toc',
      content: chapters.map((ch, idx) => ({
        title: ch.title,
        page: idx * 3 + 3, // Rough estimate
      }))
    });

    // Chapter pages
    chapters.forEach((chapter) => {
      pages.push({
        type: 'chapter',
        content: chapter,
      });
    });

    return pages;
  };

  const requestPrintPreview = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/books/${book.id}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'interior',
          include_cover: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPrintPreviewUrl(data.preview_url);
      }
    } catch (error) {
      console.error('Error generating print preview:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, previewPages.length));
  };

  const totalPages = previewMode === 'fast' ? previewPages.length : book.page_count || previewPages.length;

  return (
    <div className="flex h-full flex-col">
      {/* Header Controls */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as PreviewMode)}>
              <TabsList>
                <TabsTrigger value="fast" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Fast Preview
                </TabsTrigger>
                <TabsTrigger value="print" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Print Simulation
                  {isGenerating && <Loader2 className="h-3 w-3 animate-spin" />}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {previewMode === 'print' && !printPreviewUrl && (
              <Button
                onClick={requestPrintPreview}
                disabled={isGenerating}
                size="sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Printer className="mr-2 h-4 w-4" />
                    Generate Print Preview
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground w-16 text-center">
              {zoom}%
            </span>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-hidden bg-muted/30">
        <div className="flex h-full flex-col items-center justify-center p-8">
          {previewMode === 'fast' ? (
            <FastPreviewView
              page={previewPages[currentPage - 1]}
              zoom={zoom}
              book={book}
            />
          ) : (
            <PrintSimulationView
              previewUrl={printPreviewUrl}
              currentPage={currentPage}
              zoom={zoom}
              isGenerating={isGenerating}
              onGenerate={requestPrintPreview}
            />
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="border-t bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {previewMode === 'print' && printPreviewUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={printPreviewUrl} download>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FastPreviewView({ page, zoom, book }: { page: any; zoom: number; book: Book }) {
  if (!page) {
    return (
      <Card className="w-full max-w-4xl">
        <CardContent className="flex items-center justify-center p-12">
          <p className="text-muted-foreground">No content to preview</p>
        </CardContent>
      </Card>
    );
  }

  const trimSize = book.trim_size?.split('x') || ['6', '9'];
  const aspectRatio = parseFloat(trimSize[1]) / parseFloat(trimSize[0]);

  return (
    <Card
      className="bg-white shadow-2xl"
      style={{
        width: `${zoom}%`,
        aspectRatio: `${1 / aspectRatio}`,
        maxWidth: '800px',
      }}
    >
      <CardContent className="h-full overflow-auto p-12">
        {page.type === 'title' && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <h1 className="text-4xl font-bold mb-4">{page.content.title}</h1>
            {page.content.subtitle && (
              <h2 className="text-2xl text-muted-foreground mb-8">{page.content.subtitle}</h2>
            )}
            {page.content.author && (
              <p className="text-lg">{page.content.author}</p>
            )}
          </div>
        )}

        {page.type === 'toc' && (
          <div className="h-full">
            <h2 className="text-2xl font-bold mb-8">Table of Contents</h2>
            <div className="space-y-2">
              {page.content.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between border-b pb-2">
                  <span>{item.title}</span>
                  <span className="text-muted-foreground">{item.page}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {page.type === 'chapter' && (
          <div className="h-full">
            <h2 className="text-2xl font-bold mb-6">{page.content.title}</h2>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: renderTipTapContent(page.content.content)
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PrintSimulationView({
  previewUrl,
  currentPage,
  zoom,
  isGenerating,
  onGenerate
}: {
  previewUrl: string | null;
  currentPage: number;
  zoom: number;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  if (isGenerating) {
    return (
      <Card className="w-full max-w-4xl">
        <CardContent className="flex flex-col items-center justify-center p-12 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Generating print-quality preview...</p>
          <p className="text-sm text-muted-foreground">This may take a few moments</p>
        </CardContent>
      </Card>
    );
  }

  if (!previewUrl) {
    return (
      <Card className="w-full max-w-4xl">
        <CardContent className="flex flex-col items-center justify-center p-12 gap-4">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">Print-quality preview not generated</p>
          <p className="text-sm text-muted-foreground text-center">
            Generate a print simulation to see exactly how your book will look when printed
          </p>
          <Button onClick={onGenerate} className="mt-4">
            <Printer className="mr-2 h-4 w-4" />
            Generate Print Preview
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className="bg-white shadow-2xl"
      style={{
        width: `${zoom}%`,
        maxWidth: '800px',
      }}
    >
      <iframe
        src={`${previewUrl}#page=${currentPage}`}
        className="w-full h-full border-0"
        style={{ minHeight: '800px' }}
      />
    </div>
  );
}

function renderTipTapContent(content: any): string {
  if (!content) return '';

  // Simple TipTap JSON to HTML converter
  // In production, use @tiptap/html or similar
  const renderNode = (node: any): string => {
    if (node.type === 'text') {
      let text = node.text || '';
      if (node.marks) {
        node.marks.forEach((mark: any) => {
          if (mark.type === 'bold') text = `<strong>${text}</strong>`;
          if (mark.type === 'italic') text = `<em>${text}</em>`;
          if (mark.type === 'underline') text = `<u>${text}</u>`;
        });
      }
      return text;
    }

    const children = node.content?.map(renderNode).join('') || '';

    switch (node.type) {
      case 'paragraph': return `<p>${children}</p>`;
      case 'heading': return `<h${node.attrs?.level || 2}>${children}</h${node.attrs?.level || 2}>`;
      case 'bulletList': return `<ul>${children}</ul>`;
      case 'orderedList': return `<ol>${children}</ol>`;
      case 'listItem': return `<li>${children}</li>`;
      case 'blockquote': return `<blockquote>${children}</blockquote>`;
      case 'codeBlock': return `<pre><code>${children}</code></pre>`;
      case 'hardBreak': return '<br>';
      default: return children;
    }
  };

  if (content.type === 'doc') {
    return content.content?.map(renderNode).join('') || '';
  }

  return '';
}
