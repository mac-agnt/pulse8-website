import test from "node:test";
import assert from "node:assert/strict";

import { poolConfig } from "../../lib/booking/pg-config.ts";

// Made-up hosts and passwords only.

const POOLER = "postgresql://website_app.abcdefghijklmnop:Notreal123abc@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

test("pg-config: a hosted pooler gets TLS, encrypted without verification by default", () => {
  const config = poolConfig(POOLER);
  assert.deepEqual(config.ssl, { rejectUnauthorized: false });
  assert.equal(config.connectionString, POOLER);
});

test("pg-config: sslmode and other ssl* parameters are taken off the URL", () => {
  const config = poolConfig(`${POOLER}?sslmode=require&sslrootcert=/tmp/x.crt&application_name=web`);
  assert.equal(new URL(config.connectionString).searchParams.has("sslmode"), false);
  assert.equal(new URL(config.connectionString).searchParams.has("sslrootcert"), false);
  assert.equal(new URL(config.connectionString).searchParams.get("application_name"), "web");
  assert.deepEqual(config.ssl, { rejectUnauthorized: false });
});

test("pg-config: with a CA certificate the server is verified against it", () => {
  const pem = "-----BEGIN CERTIFICATE-----\\nMIIB\\n-----END CERTIFICATE-----";
  const config = poolConfig(POOLER, pem);
  assert.equal(config.ssl && config.ssl.rejectUnauthorized, true);
  assert.equal(config.ssl && config.ssl.ca, "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----");
});

test("pg-config: a local database has no TLS", () => {
  assert.equal(poolConfig("postgres://u:p@localhost:5432/x_test").ssl, false);
  assert.equal(poolConfig("postgres://u:p@127.0.0.1:5432/x_test?sslmode=disable").ssl, false);
});

test("pg-config: user, password, port and database survive unchanged", () => {
  const url = new URL(poolConfig(`${POOLER}?sslmode=require`).connectionString);
  assert.equal(url.username, "website_app.abcdefghijklmnop");
  assert.equal(url.password, "Notreal123abc");
  assert.equal(url.port, "6543");
  assert.equal(url.pathname, "/postgres");
});
