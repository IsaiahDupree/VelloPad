'use client';

import { useState } from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Wand2,
  Sparkles,
  ListOrdered,
  Type,
  RefreshCw,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AISidekickPanelProps {
  editor: Editor | null;
  chapterTitle: string;
}

type AIAction = 'rewrite' | 'improve' | 'shorter' | 'longer' | 'outline' | 'title';

export function AISidekickPanel({ editor, chapterTitle }: AISidekickPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [activeAction, setActiveAction] = useState<AIAction | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const getSelectedText = () => {
    if (!editor) return '';
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, ' ');
  };

  const getAllText = () => {
    if (!editor) return '';
    return editor.getText();
  };

  const handleAIAction = async (action: AIAction, customPromptText?: string) => {
    setIsLoading(true);
    setActiveAction(action);
    setResult('');

    try {
      const selectedText = getSelectedText();
      const fullText = getAllText();
      const contextText = selectedText || fullText;

      if (!contextText.trim()) {
        toast({
          title: 'No content',
          description: 'Please write some content first or select text to work with.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/ai/writing-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          text: contextText,
          chapterTitle,
          customPrompt: customPromptText,
        }),
      });

      if (!response.ok) {
        throw new Error('AI request failed');
      }

      const data = await response.json();
      setResult(data.result);

      toast({
        title: 'AI suggestion ready',
        description: 'Review the suggestion and apply it if you like it.',
      });
    } catch (error) {
      console.error('AI action error:', error);
      toast({
        title: 'AI request failed',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!editor || !result) return;

    const { from, to } = editor.state.selection;
    const selectedText = getSelectedText();

    if (selectedText) {
      // Replace selected text
      editor.chain().focus().insertContentAt({ from, to }, result).run();
    } else {
      // Insert at cursor or append
      if (activeAction === 'outline' || activeAction === 'title') {
        editor.chain().focus().insertContent(`\n\n${result}`).run();
      } else {
        editor.chain().focus().setContent(result).run();
      }
    }

    toast({
      title: 'Applied',
      description: 'AI suggestion has been applied to your chapter.',
    });

    setResult('');
    setActiveAction(null);
  };

  const handleCopy = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      toast({
        title: 'Copied',
        description: 'Text copied to clipboard.',
      });
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background border-l">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Writing Assistant
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {editor?.state.selection.empty
            ? 'Select text or use actions on full content'
            : 'Actions will apply to selected text'}
        </p>
      </div>

      <Tabs defaultValue="actions" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="actions">Quick Actions</TabsTrigger>
          <TabsTrigger value="custom">Custom Prompt</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-4">
          <TabsContent value="actions" className="space-y-3 mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Rewrite & Improve</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleAIAction('rewrite')}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4" />
                  Rewrite
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleAIAction('improve')}
                  disabled={isLoading}
                >
                  <Wand2 className="h-4 w-4" />
                  Improve Writing
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleAIAction('shorter')}
                  disabled={isLoading}
                >
                  Make Shorter
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleAIAction('longer')}
                  disabled={isLoading}
                >
                  Make Longer
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Generate Ideas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleAIAction('outline')}
                  disabled={isLoading}
                >
                  <ListOrdered className="h-4 w-4" />
                  Generate Outline
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleAIAction('title')}
                  disabled={isLoading}
                >
                  <Type className="h-4 w-4" />
                  Suggest Titles
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom" className="space-y-3 mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Custom Prompt</CardTitle>
                <CardDescription>
                  Describe what you want AI to do with your text
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="E.g., 'Make this more engaging' or 'Add more descriptive details'"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={4}
                />
                <Button
                  className="w-full gap-2"
                  onClick={() => {
                    if (customPrompt.trim()) {
                      handleAIAction('rewrite', customPrompt);
                    }
                  }}
                  disabled={isLoading || !customPrompt.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Result Panel */}
      {result && (
        <div className="border-t p-4 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">AI Suggestion</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-md p-3 text-sm max-h-48 overflow-y-auto border">
            {result}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleApply} className="flex-1 gap-2">
              <Check className="h-4 w-4" />
              Apply
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setResult('');
                setActiveAction(null);
              }}
            >
              Discard
            </Button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !result && (
        <div className="border-t p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating AI suggestion...
        </div>
      )}
    </div>
  );
}
