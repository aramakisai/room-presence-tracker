import { InteractionType, InteractionResponseType } from "discord-interactions";
import { db } from "@/lib/db";
import { users, presenceLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const DISCORD_COMMANDS = [
  {
    name: "presence",
    description: "現在の実行委員室の在室者一覧を表示します",
  },
  {
    name: "toggle",
    description: "自分の在室状態をトグルします",
  },
];

export async function registerDiscordCommands() {
  const url = `https://discord.com/api/v10/applications/${process.env.DISCORD_APPLICATION_ID}/commands`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(DISCORD_COMMANDS),
  });
  if (!response.ok) {
    throw new Error(`Failed to register commands: ${await response.text()}`);
  }
}

export async function handlePresenceCommand() {
  const presentUsers = await db.query.users.findMany({
    where: eq(users.isPresent, true),
    columns: { name: true, isKiosk: true },
  });

  const humanUsers = presentUsers.filter((u) => !u.isKiosk);

  if (humanUsers.length === 0) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: "🏢 現在、実行委員室に在室している人はいません。" },
    };
  }

  const list = humanUsers.map((u) => `• ${u.name}`).join("\n");
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `🏢 **現在の在室者 (${humanUsers.length}名)**\n${list}`,
    },
  };
}

export async function handleToggleCommand(discordUserId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.discordId, discordUserId),
  });

  if (!user) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content:
          "⚠️ あなたのアカウントが見つかりません。先にWebサイトでログインしてください。",
      },
    };
  }

  const newPresence = !user.isPresent;
  await db
    .update(users)
    .set({ isPresent: newPresence, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await db.insert(presenceLogs).values({
    userId: user.id,
    action: newPresence ? "ENTER" : "EXIT",
    triggeredBy: "discord",
  });

  const statusText = newPresence ? "🟢 在室中" : "🔴 退室";
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: `${statusText} に更新しました。` },
  };
}

export { InteractionType, InteractionResponseType };
