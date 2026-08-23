import { readFileSync } from "node:fs";
import { Client } from "pg";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of raw.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diset di .env.local");
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const tables = await client.query(`
  select tablename from pg_tables
  where schemaname = 'public'
  order by tablename
`);
console.log("TABLES:", tables.rows.map((r) => r.tablename).join(", "));

const policies = await client.query(`
  select count(*)::int as total from pg_policies where schemaname in ('public','storage')
`);
console.log("POLICIES:", policies.rows[0].total);

const cols = await client.query(`
  select column_name from information_schema.column_privileges
  where grantee='authenticated' and table_name='submissions' and privilege_type='UPDATE'
`);
console.log("SUBMISSION UPDATABLE COLS:", cols.rows.map((r) => r.column_name).join(", "));

const buckets = await client.query(`select id from storage.buckets order by id`);
console.log("BUCKETS:", buckets.rows.map((r) => r.id).join(", "));

const trig = await client.query(
  `select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal`
);
console.log("AUTH TRIGGERS:", trig.rows.map((r) => r.tgname).join(", "));

const pub = await client.query(`
  select pt.tablename from pg_publication_tables pt
  where pt.pubname='supabase_realtime' and pt.tablename='notifications'
`);
console.log("REALTIME notifications:", pub.rows.length > 0 ? "OK" : "MISSING");

await client.end();
