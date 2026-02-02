import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// AI-001: Prompt Sidekick Panel
// Provides AI writing assistance: rewrite, improve, outline, title suggestions

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, text, chapterTitle, customPrompt } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Build prompt based on action
    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'rewrite':
        if (customPrompt) {
          systemPrompt =
            'You are a professional writing assistant. Rewrite the text according to the user\'s instructions while maintaining the core meaning and tone.';
          userPrompt = `Instructions: ${customPrompt}\n\nText to rewrite:\n${text}`;
        } else {
          systemPrompt =
            'You are a professional writing assistant. Rewrite the text to improve clarity and flow while maintaining the original meaning and tone.';
          userPrompt = text;
        }
        break;

      case 'improve':
        systemPrompt =
          'You are a professional editor. Improve the writing quality by enhancing clarity, flow, grammar, and style. Keep the core message intact but make it more engaging and polished.';
        userPrompt = text;
        break;

      case 'shorter':
        systemPrompt =
          'You are a professional editor. Make the text more concise while preserving all key points and maintaining clarity. Remove redundancy and wordiness.';
        userPrompt = text;
        break;

      case 'longer':
        systemPrompt =
          'You are a creative writing assistant. Expand the text by adding more detail, description, and depth. Make it more engaging and vivid while staying true to the original idea.';
        userPrompt = text;
        break;

      case 'outline':
        systemPrompt =
          'You are a professional writing consultant. Based on the provided text, create a clear, hierarchical outline that organizes the main ideas and supporting points. Use bullet points or numbered lists.';
        userPrompt = `Chapter Title: ${chapterTitle}\n\nContent:\n${text}`;
        break;

      case 'title':
        systemPrompt =
          'You are a creative title consultant. Generate 5 compelling, creative title suggestions for this chapter. Each title should be engaging, clear, and capture the essence of the content. Present them as a numbered list.';
        userPrompt = `Chapter content:\n${text}`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Call AI service (placeholder - integrate with OpenAI, Anthropic, or other AI service)
    const result = await generateAIResponse(systemPrompt, userPrompt);

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error('Error in AI writing assistant:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI response' },
      { status: 500 }
    );
  }
}

// AI Response Generator
// TODO: Replace with actual AI service integration (OpenAI, Anthropic, etc.)
async function generateAIResponse(systemPrompt: string, userPrompt: string): Promise<string> {
  // Check for OpenAI API key in environment
  const openaiKey = process.env.OPENAI_API_KEY;

  if (openaiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content?.trim() || 'No response generated';
    } catch (error) {
      console.error('OpenAI API error:', error);
      // Fall through to mock response
    }
  }

  // Mock response for development/testing when no API key is available
  return getMockResponse(systemPrompt, userPrompt);
}

// Mock responses for development (when no AI API key is configured)
function getMockResponse(systemPrompt: string, userPrompt: string): string {
  if (systemPrompt.includes('Rewrite')) {
    return `[AI Suggestion] This is a rewritten version of your text. In a production environment, this would be generated by an AI service like OpenAI GPT-4.\n\nTo enable real AI features, add your OPENAI_API_KEY to the environment variables.`;
  }

  if (systemPrompt.includes('Improve')) {
    return `[AI Suggestion] This is an improved version with better clarity and flow. Configure your AI service to see real improvements.`;
  }

  if (systemPrompt.includes('shorter')) {
    return `[AI Suggestion] Concise version of your text. Add OPENAI_API_KEY for real AI-powered editing.`;
  }

  if (systemPrompt.includes('longer')) {
    return `[AI Suggestion] Expanded version with more detail and depth. Real AI expansion available with API key configuration.`;
  }

  if (systemPrompt.includes('outline')) {
    return `# Chapter Outline\n\n1. Main Point One\n   - Supporting detail A\n   - Supporting detail B\n\n2. Main Point Two\n   - Supporting detail A\n   - Supporting detail B\n\n3. Main Point Three\n   - Supporting detail A\n   - Supporting detail B\n\n*Configure OPENAI_API_KEY for AI-generated outlines*`;
  }

  if (systemPrompt.includes('title')) {
    return `1. An Engaging Title\n2. The Journey Begins\n3. Discovering New Perspectives\n4. A Fresh Look at the Story\n5. The Heart of the Matter\n\n*Add OPENAI_API_KEY to generate AI-powered title suggestions*`;
  }

  return '[AI Placeholder] Configure your AI service API key to enable real AI suggestions.';
}
