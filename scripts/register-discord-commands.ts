/**
 * Discord スラッシュコマンドを登録するスクリプト
 * 実行: npx tsx scripts/register-discord-commands.ts
 */

import "dotenv/config";
import { registerDiscordCommands } from "../src/lib/discord";

async function main() {
  if (!process.env.DISCORD_APPLICATION_ID || !process.env.DISCORD_BOT_TOKEN) {
    console.error(
      "Error: DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN must be set"
    );
    process.exit(1);
  }

  console.log("Registering Discord slash commands...");
  await registerDiscordCommands();
  console.log("✅ Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
