import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, content, userEmail, userName, userId, userAgent, url } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
    }

    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!slackWebhookUrl) {
      console.error("SLACK_WEBHOOK_URL is not configured");
      return NextResponse.json(
        { error: "Slack webhook URL이 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // Slack message formatting
    const emoji = type === "bug" ? "🐛" : "💡";
    const color = type === "bug" ? "#ef4444" : "#3b82f6";
    const typeText = type === "bug" ? "버그 제보" : "개선 의견";

    const slackMessage = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${emoji} ${typeText}`,
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*사용자:*\n${userName} (${userEmail})`,
            },
            {
              type: "mrkdwn",
              text: `*페이지:*\n<${url}|${url}>`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*내용:*\n${content}`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `User Agent: ${userAgent}`,
            },
          ],
        },
        {
          type: "divider",
        },
      ],
      attachments: [
        {
          color,
          fields: [
            {
              title: "User ID",
              value: userId || "비로그인",
              short: true,
            },
            {
              title: "접수 시각",
              value: new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
              short: true,
            },
          ],
        },
      ],
    };

    const slackResponse = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(slackMessage),
    });

    if (!slackResponse.ok) {
      throw new Error(`Slack API error: ${slackResponse.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("피드백 전송 실패:", error);
    return NextResponse.json(
      { error: "피드백 전송에 실패했습니다. 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
