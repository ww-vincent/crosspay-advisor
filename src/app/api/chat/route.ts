import { NextRequest } from 'next/server';

const COZE_API_TOKEN = process.env.COZE_WORKLOAD_API_TOKEN || '';

// Agent configs per user role
const AGENT_CONFIGS: Record<string, { url: string; projectId: number; defaultSessionId: string }> = {
  test_stu: {
    url: 'https://6mx432bwhs.coze.site/stream_run',
    projectId: 7642921445634474038,
    defaultSessionId: 'GGDz84qE0u0scCkbY4D5c',
  },
  test_worker: {
    url: 'https://2gn7crs4cz.coze.site/stream_run',
    projectId: 7643008982025519123,
    defaultSessionId: '9KkU5A3zS-yTZx9HuKaVj',
  },
};

const DEFAULT_CONFIG = AGENT_CONFIGS.test_stu;

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, username } = body;

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Select agent config based on username
    const config = (username && AGENT_CONFIGS[username]) || DEFAULT_CONFIG;

    // Build request to Coze stream_run API
    const cozeBody = {
      content: {
        query: {
          prompt: [
            {
              type: 'text',
              content: {
                text: message,
              },
            },
          ],
        },
      },
      type: 'query',
      // Each frontend session gets its own Coze session_id for independent context
      session_id: sessionId || config.defaultSessionId,
      project_id: config.projectId,
    };

    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${COZE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cozeBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[/api/chat] Coze API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Coze API error: ${response.status}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Stream the SSE response back to the client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE events
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              // Forward all SSE lines to the client
              controller.enqueue(new TextEncoder().encode(line + '\n'));
            }
          }

          // Flush remaining buffer
          if (buffer.trim()) {
            controller.enqueue(new TextEncoder().encode(buffer.trim() + '\n'));
          }
        } catch (err) {
          console.error('[/api/chat] Stream error:', err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('[/api/chat] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
