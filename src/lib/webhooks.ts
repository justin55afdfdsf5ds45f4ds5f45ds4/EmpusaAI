import { getActiveWebhooks } from './db';

export async function fireBlockedAlert(sessionId: string, reason: string) {
  const hooks = getActiveWebhooks();
  if (hooks.length === 0) return;

  const timestamp = new Date().toISOString();

  for (const hook of hooks) {
    try {
      let body: string;

      if (hook.type === 'discord') {
        body = JSON.stringify({
          content: null,
          embeds: [{
            title: 'Empusa: Session BLOCKED',
            description: reason,
            color: 0xff4444,
            fields: [
              { name: 'Session', value: `\`${sessionId}\``, inline: true },
              { name: 'Time', value: timestamp, inline: true },
            ],
            footer: { text: 'EmpusaAI Guardrail' },
          }],
        });
      } else {
        // Slack-compatible (also works for generic webhooks)
        body = JSON.stringify({
          text: `*Empusa: Session BLOCKED*\n>Session: \`${sessionId}\`\n>Reason: ${reason}\n>Time: ${timestamp}`,
        });
      }

      // Fire and forget — don't block the request pipeline
      fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }).catch(() => {
        // Webhook delivery failed — don't crash the system
      });
    } catch {
      // Skip broken hooks
    }
  }
}
