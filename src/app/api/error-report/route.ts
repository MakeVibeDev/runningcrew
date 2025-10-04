import { NextRequest, NextResponse } from "next/server";

const SEVERITY_EMOJIS = {
  low: '💬',
  medium: '⚠️',
  high: '🚨',
  critical: '🔥',
};

const SEVERITY_COLORS = {
  low: '#36a64f',
  medium: '#ff9800',
  high: '#f44336',
  critical: '#9c27b0',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { error, context, severity = 'medium', environment } = body;

    const slackWebhookUrl = process.env.SLACK_ERROR_WEBHOOK_URL;

    if (!slackWebhookUrl) {
      console.error('SLACK_ERROR_WEBHOOK_URL is not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const emoji = SEVERITY_EMOJIS[severity as keyof typeof SEVERITY_EMOJIS] || '❓';
    const color = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || '#cccccc';

    // Build context fields
    const fields = [];

    if (context?.userId) {
      fields.push({
        title: '👤 User',
        value: `${context.userName || 'Unknown'} (${context.userId})`,
        short: true,
      });
    }

    if (context?.action) {
      fields.push({
        title: '🎯 Action',
        value: context.action,
        short: true,
      });
    }

    if (context?.url) {
      fields.push({
        title: '🔗 URL',
        value: context.url,
        short: false,
      });
    }

    if (context?.userAgent) {
      fields.push({
        title: '🖥️ User Agent',
        value: context.userAgent.substring(0, 100),
        short: false,
      });
    }

    if (environment) {
      fields.push({
        title: '🌍 Environment',
        value: environment,
        short: true,
      });
    }

    if (context?.timestamp) {
      fields.push({
        title: '⏰ Timestamp',
        value: new Date(context.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        short: true,
      });
    }

    // Add metadata if present
    if (context?.metadata) {
      const metadataStr = Object.entries(context.metadata)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `• ${key}: ${JSON.stringify(value)}`)
        .join('\n');

      if (metadataStr) {
        fields.push({
          title: '📋 Additional Info',
          value: metadataStr,
          short: false,
        });
      }
    }

    // Build stack trace (truncate if too long)
    let stackTrace = error.stack || 'No stack trace available';
    if (stackTrace.length > 2000) {
      stackTrace = stackTrace.substring(0, 2000) + '\n... (truncated)';
    }

    const slackMessage = {
      username: 'RunningCrew Error Reporter',
      icon_emoji: ':warning:',
      attachments: [
        {
          color,
          fallback: `${emoji} ${severity.toUpperCase()}: ${error.message}`,
          title: `${emoji} ${severity.toUpperCase()}: ${error.name || 'Error'}`,
          text: error.message,
          fields,
          footer: 'RunningCrew Error Monitoring',
          footer_icon: 'https://runningcrew.vercel.app/logo2.png',
          ts: Math.floor(Date.now() / 1000),
        },
        {
          color: '#e0e0e0',
          title: '📜 Stack Trace',
          text: `\`\`\`\n${stackTrace}\n\`\`\``,
          mrkdwn_in: ['text'],
        },
      ],
    };

    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackMessage),
    });

    if (!response.ok) {
      throw new Error(`Slack API responded with status ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error reporting to Slack:', err);
    return NextResponse.json(
      { error: 'Failed to send error report' },
      { status: 500 }
    );
  }
}
