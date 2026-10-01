import { NextRequest, NextResponse } from 'next/server';
import { runAgent, pickModel, type AgentMessage } from '@/lib/agent';
import { storageGet, storageSet } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface UsageTotals {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  sessionCount: number;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, model: forceModel, sessionId } = await req.json() as {
      messages: AgentMessage[];
      model?: string;
      sessionId?: string;
    };

    if (!messages?.length) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 });
    }

    const result = await runAgent(messages, forceModel);

    // Track cumulative usage
    const usageKey = 'nibl:usage:totals';
    const existing = (await storageGet<UsageTotals>(usageKey)) ?? {
      totalInputTokens: 0, totalOutputTokens: 0, totalCostUsd: 0, sessionCount: 0,
    };
    const updated: UsageTotals = {
      totalInputTokens: existing.totalInputTokens + result.usage.inputTokens,
      totalOutputTokens: existing.totalOutputTokens + result.usage.outputTokens,
      totalCostUsd: existing.totalCostUsd + result.usage.costUsd,
      sessionCount: existing.sessionCount + 1,
    };
    await storageSet(usageKey, updated);

    // Persist chat history if sessionId provided
    if (sessionId) {
      const histKey = `nibl:chat:${sessionId}`;
      const history = (await storageGet<AgentMessage[]>(histKey)) ?? [];
      const lastUser = messages[messages.length - 1];
      history.push(lastUser, { role: 'assistant', content: result.text });
      await storageSet(histKey, history.slice(-100)); // keep last 100 messages
    }

    // Suggest model for next message
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
    const suggestedModel = pickModel(lastUserMsg);

    return NextResponse.json({
      text: result.text,
      chartSpecs: result.chartSpecs,
      usage: result.usage,
      model: result.model,
      suggestedModel,
      usageTotals: updated,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/api/agent]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
