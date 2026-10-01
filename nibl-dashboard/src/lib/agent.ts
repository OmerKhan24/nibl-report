/**
 * Claude agent with Odoo tool-use.
 * Uses Sonnet for complex queries, Haiku for simple lookups.
 */
import Anthropic from '@anthropic-ai/sdk';
import { odooQuery } from './odoo';
import { sqlQuery } from './db';

export const SONNET = 'claude-sonnet-4-6';
export const HAIKU = 'claude-haiku-4-5-20251001';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Complexity classifier ────────────────────────────────────────────────────
const COMPLEX_SIGNALS = [
  'sku', 'product', 'city', 'breakdown', 'forecast', 'predict', 'trend',
  'compare', 'vs', 'versus', 'monthly', 'weekly', 'join', 'multi', 'report',
  'excel', 'export', 'chart', 'graph', 'top', 'rank',
];
export function pickModel(prompt: string): typeof SONNET | typeof HAIKU {
  const lower = prompt.toLowerCase();
  return COMPLEX_SIGNALS.some(s => lower.includes(s)) ? SONNET : HAIKU;
}

// ── NIBL system context ──────────────────────────────────────────────────────
const SYSTEM = `You are the NIBL Foods reporting agent. You help the finance and operations team
query Odoo ERP data and generate reports.

NIBL Odoo context:
- company_id = 1
- Account 1121001 = Receivable from Customers
- Account 31005 = Sale Return
- Journal 16 = Dubai Islamic Bank, 17 = KHI Cash, 18 = ISB Cash, 19 = Faysal Bank
- Partner field x_studio_channel = sales channel (Web, Online Market Place, GYM, etc.)
- B2C partners: Trax, PayFast, Postex, Shopify (check partner name)
- Key models: sale.order, account.move (invoices), account.payment, account.move.line,
  stock.move.line (inventory moves), product.product, product.template, res.partner,
  stock.quant (current stock)

Always filter by company_id = 1 unless told otherwise.
For date ranges use 'date' field on most models, 'invoice_date' on account.move.
State filter: sale.order uses state in ['sale','done'], account.move uses state='posted'.

When generating reports:
1. Use odoo_query to fetch data (multiple calls if needed for joins)
2. Process and aggregate in your response
3. Use create_chart_spec for any visual
4. Always offer to export as Excel

You have TWO query tools:
- sql_query: direct PostgreSQL — USE THIS for any multi-table join, aggregation, SKU/city/channel breakdown, or trend report. Much faster.
- odoo_query: XML-RPC — use only for simple single-model lookups or when you need Odoo business logic.

For predictions: use compute_prediction with time-series data.
Keep responses concise. Lead with numbers, then context.`;

// ── Tool definitions ─────────────────────────────────────────────────────────
export const TOOLS: Anthropic.Tool[] = [
  {
    name: 'sql_query',
    description: `Run a raw PostgreSQL SELECT query directly on the NIBL Odoo database.
Use this for complex reports requiring JOINs across multiple tables — it is much faster than odoo_query for aggregations.
ALWAYS prefer sql_query over odoo_query for: SKU breakdowns, city × channel × product reports, monthly trends, inventory vs sales joins.
Key tables: sale_order, sale_order_line, res_partner, product_product, product_template, account_move, account_payment, account_move_line, stock_quant, res_company, uom_uom, x_customer_channel.
Important: product names are stored as JSONB e.g. template.name->>'en_US'. Channel names: channel.x_name->>'en_US'. Only SELECT — no INSERT/UPDATE/DELETE.`,
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Valid PostgreSQL SELECT query. Use $1, $2 for params.' },
        params: { type: 'array', description: 'Optional query parameters matching $1, $2 placeholders', items: {} },
        limit_rows: { type: 'number', description: 'Wrap query in LIMIT if result might be large. Default 500.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'odoo_query',
    description: 'Query any Odoo model via search_read or read_group. Use for fetching data.',
    input_schema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'e.g. sale.order, account.move, product.product' },
        method: { type: 'string', enum: ['search_read', 'read_group', 'search'], description: 'Odoo method' },
        domain: { type: 'array', description: 'Odoo domain filter list e.g. [["state","=","sale"]]' },
        fields: { type: 'array', items: { type: 'string' }, description: 'Fields to fetch' },
        groupby: { type: 'array', items: { type: 'string' }, description: 'For read_group: group by fields' },
        order: { type: 'string', description: 'e.g. "amount_total desc"' },
        limit: { type: 'number', description: 'Max records, default 1000' },
      },
      required: ['model', 'domain'],
    },
  },
  {
    name: 'list_odoo_fields',
    description: 'Discover available fields on an Odoo model. Use when unsure of field names.',
    input_schema: {
      type: 'object',
      properties: {
        model: { type: 'string' },
        filter_type: { type: 'string', description: 'Optional: filter by field type e.g. many2one, char, float' },
      },
      required: ['model'],
    },
  },
  {
    name: 'create_chart_spec',
    description: 'Create a Recharts chart specification from data.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['bar', 'line', 'pie', 'area', 'composed'], description: 'Chart type' },
        title: { type: 'string' },
        data: { type: 'array', description: 'Array of objects e.g. [{name:"Jan", value:1000}]' },
        xKey: { type: 'string', description: 'Key for X axis' },
        series: {
          type: 'array',
          description: 'Data series e.g. [{key:"revenue", color:"#3b82f6", name:"Revenue"}]',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              color: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
        currency: { type: 'boolean', description: 'Format values as PKR currency' },
      },
      required: ['type', 'title', 'data', 'xKey', 'series'],
    },
  },
  {
    name: 'compute_prediction',
    description: 'Compute a linear trend / forecast on time-series data.',
    input_schema: {
      type: 'object',
      properties: {
        data: { type: 'array', description: 'Array of {period, value} objects sorted by period' },
        periods_ahead: { type: 'number', description: 'How many future periods to forecast' },
        period_label: { type: 'string', description: 'e.g. "Month" or "Week"' },
      },
      required: ['data', 'periods_ahead'],
    },
  },
];

// ── Tool executor ────────────────────────────────────────────────────────────
async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  if (name === 'sql_query') {
    const { query, params = [], limit_rows = 500 } = input as { query: string; params?: unknown[]; limit_rows?: number };
    // Safety: block write statements
    const upper = query.trim().toUpperCase();
    if (/^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE)\b/.test(upper)) {
      return JSON.stringify({ error: 'Only SELECT queries are allowed.' });
    }
    // Wrap in limit if not already present
    const limited = upper.includes('LIMIT') ? query : `SELECT * FROM (${query}) _q LIMIT ${limit_rows}`;
    const rows = await sqlQuery(limited, params as unknown[]);
    return JSON.stringify({ rowCount: rows.length, rows });
  }

  if (name === 'odoo_query') {
    const { model, method = 'search_read', domain, fields, groupby, order, limit = 1000 } = input as {
      model: string; method?: string; domain: unknown[]; fields?: string[];
      groupby?: string[]; order?: string; limit?: number;
    };
    if (method === 'read_group') {
      const result = await odooQuery(model, 'read_group', [domain, fields || [], groupby || []], {
        orderby: order, limit,
      });
      return JSON.stringify(result);
    }
    if (method === 'search') {
      const result = await odooQuery(model, 'search', [domain], { limit });
      return JSON.stringify(result);
    }
    const result = await odooQuery(model, 'search_read', [domain], {
      fields: fields || ['id', 'name'], order, limit,
    });
    return JSON.stringify(result);
  }

  if (name === 'list_odoo_fields') {
    const { model, filter_type } = input as { model: string; filter_type?: string };
    const result = await odooQuery<Record<string, { type: string; string: string }>>(
      model, 'fields_get', [], { attributes: ['type', 'string'] }
    );
    const entries = Object.entries(result);
    const filtered = filter_type ? entries.filter(([, v]) => v.type === filter_type) : entries;
    return JSON.stringify(
      filtered.slice(0, 80).map(([k, v]) => ({ field: k, type: v.type, label: v.string }))
    );
  }

  if (name === 'create_chart_spec') {
    // Pass through — the client renders it
    return JSON.stringify({ __chartSpec: true, ...input });
  }

  if (name === 'compute_prediction') {
    const { data, periods_ahead, period_label = 'Period' } = input as {
      data: { period: string; value: number }[];
      periods_ahead: number;
      period_label?: string;
    };
    const n = data.length;
    if (n < 2) return JSON.stringify({ error: 'Need at least 2 data points' });
    const xs = data.map((_, i) => i);
    const ys = data.map(d => d.value);
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
    const sumX2 = xs.reduce((s, x) => s + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const forecast = Array.from({ length: periods_ahead }, (_, i) => ({
      period: `${period_label} +${i + 1}`,
      value: Math.round(intercept + slope * (n + i)),
      forecast: true,
    }));
    const trend = slope > 0 ? 'upward' : slope < 0 ? 'downward' : 'flat';
    return JSON.stringify({ trend, slope: Math.round(slope), forecast, combined: [...data, ...forecast] });
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` });
}

// ── Usage tracker ────────────────────────────────────────────────────────────
export interface UsageRecord {
  inputTokens: number;
  outputTokens: number;
  model: string;
  costUsd: number;
}

function calcCost(model: string, input: number, output: number): number {
  // Pricing per 1M tokens (as of mid-2026 approximate)
  const rates: Record<string, [number, number]> = {
    [SONNET]: [3.0, 15.0],
    [HAIKU]: [0.8, 4.0],
  };
  const [inRate, outRate] = rates[model] ?? [3.0, 15.0];
  return (input / 1_000_000) * inRate + (output / 1_000_000) * outRate;
}

// ── Main agent runner ────────────────────────────────────────────────────────
export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentResult {
  text: string;
  chartSpecs: unknown[];
  usage: UsageRecord;
  model: string;
}

export async function runAgent(
  messages: AgentMessage[],
  forceModel?: string
): Promise<AgentResult> {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
  const model = forceModel ?? pickModel(lastUserMsg);

  const anthropicMessages: Anthropic.MessageParam[] = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  let totalInput = 0;
  let totalOutput = 0;
  const chartSpecs: unknown[] = [];
  let finalText = '';

  // Agentic loop — max 6 iterations
  for (let iter = 0; iter < 6; iter++) {
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: SYSTEM,
      tools: TOOLS,
      messages: anthropicMessages,
    });

    totalInput += response.usage.input_tokens;
    totalOutput += response.usage.output_tokens;

    if (response.stop_reason === 'end_turn') {
      finalText = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as Anthropic.TextBlock).text)
        .join('');
      break;
    }

    if (response.stop_reason === 'tool_use') {
      // Add assistant message
      anthropicMessages.push({ role: 'assistant', content: response.content });

      // Execute all tool calls
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        let result: string;
        try {
          result = await executeTool(block.name, block.input as Record<string, unknown>);
        } catch (e) {
          result = JSON.stringify({ error: String(e) });
        }
        // Extract chart specs
        try {
          const parsed = JSON.parse(result);
          if (parsed.__chartSpec) chartSpecs.push(parsed);
        } catch { /* not JSON */ }

        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
      }
      anthropicMessages.push({ role: 'user', content: toolResults });
    }
  }

  const costUsd = calcCost(model, totalInput, totalOutput);
  return {
    text: finalText,
    chartSpecs,
    usage: { inputTokens: totalInput, outputTokens: totalOutput, model, costUsd },
    model,
  };
}
