import { NextRequest, NextResponse } from "next/server";
import {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} from "discord-interactions";
import {
  handlePresenceCommand,
  handleToggleCommand,
} from "@/lib/discord";

// discord-interactions requires the raw body for signature verification
export const runtime = "nodejs";

async function verifyDiscordRequest(
  req: NextRequest
): Promise<{ isValid: boolean; body: string }> {
  const signature = req.headers.get("x-signature-ed25519") ?? "";
  const timestamp = req.headers.get("x-signature-timestamp") ?? "";
  const body = await req.text();

  const isValid = await verifyKey(
    body,
    signature,
    timestamp,
    process.env.DISCORD_PUBLIC_KEY!
  );

  return { isValid, body };
}

export async function POST(req: NextRequest) {
  const { isValid, body } = await verifyDiscordRequest(req);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const interaction = JSON.parse(body);

  // PING from Discord (required for verification)
  if (interaction.type === InteractionType.PING) {
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }

  // Slash commands
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const commandName = interaction.data?.name as string;
    const discordUserId = interaction.member?.user?.id ?? interaction.user?.id;

    switch (commandName) {
      case "presence":
        return NextResponse.json(await handlePresenceCommand());

      case "toggle":
        return NextResponse.json(await handleToggleCommand(discordUserId));

      default:
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: "⚠️ 不明なコマンドです。" },
        });
    }
  }

  return NextResponse.json({ error: "Unknown interaction type" }, { status: 400 });
}
