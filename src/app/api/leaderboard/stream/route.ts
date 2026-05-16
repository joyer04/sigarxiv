import { getLeaderboard } from '@/lib/leaderboard';

export const dynamic = 'force-dynamic';

const INTERVAL_MS = 10_000;

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: unknown) {
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      }

      // Send immediately on connect
      try {
        const data = await getLeaderboard();
        send(data);
      } catch {
        send({ error: 'Failed to load leaderboard' });
      }

      // Then push on interval
      const interval = setInterval(async () => {
        try {
          const data = await getLeaderboard();
          send(data);
        } catch {
          send({ error: 'Failed to refresh leaderboard' });
        }
      }, INTERVAL_MS);

      // Clean up when client disconnects
      return () => clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
