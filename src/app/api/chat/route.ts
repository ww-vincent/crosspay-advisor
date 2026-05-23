import { NextRequest } from 'next/server';

const COZE_API_URL = 'https://6mx432bwhs.coze.site/stream_run';
const COZE_API_TOKEN = process.env.COZE_WORKLOAD_API_TOKEN || '';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId } = body;

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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
      session_id: sessionId || undefined,
      project_id: 7642921445634474038,
    };

    const response = await fetch(COZE_API_URL, {
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
