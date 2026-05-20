import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

// ---------- Enums ----------
export const actionEnum = pgEnum("action_type", ["ENTER", "EXIT", "RESET"]);
export const triggeredByEnum = pgEnum("triggered_by_type", [
  "self",
  "kiosk",
  "discord",
  "system",
]);

// ---------- Users ----------
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** Authentik OIDC subject */
  sub: text("sub").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  /** 学生証バーコード番号（Authentik カスタム claim: student_id） */
  studentId: text("student_id"),
  /** Discord User ID（Authentik Discord OAuth ソース経由） */
  discordId: text("discord_id"),
  isPresent: boolean("is_present").notNull().default(false),
  /** kiosk グループに所属しているサービスアカウント */
  isKiosk: boolean("is_kiosk").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------- Presence Logs ----------
export const presenceLogs = pgTable("presence_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: actionEnum("action").notNull(),
  triggeredBy: triggeredByEnum("triggered_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------- Types ----------
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PresenceLog = typeof presenceLogs.$inferSelect;
export type NewPresenceLog = typeof presenceLogs.$inferInsert;
