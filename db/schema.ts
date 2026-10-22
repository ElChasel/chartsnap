import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";
export const sessions = sqliteTable(
  "analytics_sessions",
  {
    id: text("id").primaryKey(),
    visitorId: text("visitor_id").notNull(),
    startedAt: integer("started_at").notNull(),
    lastSeen: integer("last_seen").notNull(),
    channel: text("channel").notNull(),
    campaign: text("campaign").notNull().default(""),
    country: text("country").notNull(),
    device: text("device").notNull(),
    os: text("os").notNull(),
    browser: text("browser").notNull(),
    returning: integer("returning").notNull().default(0),
    rateWindow: integer("rate_window").notNull(),
    rateCount: integer("rate_count").notNull().default(0),
  },
  (t) => [
    index("sessions_visitor").on(t.visitorId),
    index("sessions_last_seen").on(t.lastSeen),
  ],
);
export const events = sqliteTable(
  "analytics_events",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    visitorId: text("visitor_id").notNull(),
    name: text("name").notNull(),
    ts: integer("ts").notNull(),
    properties: text("properties").notNull().default("{}"),
    duration: integer("duration_ms"),
  },
  (t) => [
    index("events_time").on(t.ts),
    index("events_session").on(t.sessionId),
  ],
);
export const aiUsage = sqliteTable("ai_usage", {
  day: text("day").primaryKey(),
  calls: integer("calls").notNull().default(0),
});
export const aiRequests = sqliteTable(
  "ai_requests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    ts: integer("ts").notNull(),
  },
  (t) => [index("ai_requests_user_time").on(t.userId, t.ts)],
);
