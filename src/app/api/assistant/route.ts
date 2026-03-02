import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

const SYSTEM_PROMPT = `You are an AI therapy assistant helping a therapist during a cross-language therapy session. You are observing a real-time transcript of a conversation between a therapist and their client, conducted through speech translation.

Your role is to be HIGHLY PROACTIVE. Do not wait to be asked. Continuously analyze the conversation and provide actionable insights across these categories:

1. CULTURAL CONTEXT: Identify cultural norms, values, communication patterns, or expectations that may be relevant. Flag when cultural context might affect interpretation of the client's words or behavior.

2. THERAPEUTIC SUGGESTIONS: Recommend specific techniques, follow-up questions, or interventions. Reference evidence-based approaches (CBT, DBT, ACT, psychodynamic, etc.) when relevant.

3. MISCOMMUNICATION FLAGS: Identify moments where translation may have lost nuance, where idioms may not translate well, where emotional tone may differ from literal meaning, or where cultural misunderstanding may occur.

4. SESSION NOTES: Track key themes, emotional shifts, stated goals, and progress indicators.

Return ONLY valid JSON matching this exact structure (no markdown, no code fences):
{
  "cultural": [{"title": "...", "content": "..."}],
  "techniques": [{"title": "...", "content": "...", "approach": "..."}],
  "flags": [{"title": "...", "content": "...", "severity": "high|medium|low"}],
  "notes": [{"title": "...", "content": "..."}]
}

Focus on what is NEW since the last analysis. Be specific and actionable. Keep each item concise (1-3 sentences). If there is nothing new to report in a category, return an empty array for it.`;

const SUMMARY_PROMPT = `You are an AI therapy assistant. Analyze the complete transcript of a cross-language therapy session and produce a comprehensive session summary.

Return ONLY valid JSON matching this structure (no markdown, no code fences):
{
  "summary": "A 2-3 paragraph narrative summary covering key themes, emotional trajectory, cultural considerations, and therapeutic progress.",
  "themes": ["theme1", "theme2"],
  "keyMoments": ["moment1", "moment2"],
  "recommendations": ["recommendation1", "recommendation2"]
}`;

export async function POST(req: NextRequest) {
  try {
    const { transcript, therapistLanguage, clientLanguage, previousSummary, generateSummary: isSummary } = await req.json();

    if (!transcript) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }

    const userMessage = [
      `Therapist speaks: ${therapistLanguage || 'unknown'}`,
      `Client speaks: ${clientLanguage || 'unknown'}`,
      previousSummary ? `\nPrevious session context:\n${previousSummary}` : '',
      `\nRecent transcript:\n${transcript}`,
    ].join('\n');

    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: isSummary ? 2048 : 1024,
      system: isSummary ? SUMMARY_PROMPT : SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Extract text from response
    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No text response' }, { status: 500 });
    }

    // Parse JSON from Claude's response
    const parsed = JSON.parse(textBlock.text);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('Assistant error:', err);
    return NextResponse.json({ error: 'Assistant analysis failed' }, { status: 500 });
  }
}
