/**
 * Connection settings from BOOKING_DATABASE_URL.
 *
 * TLS is set here, not from the URL: node-pg reads `sslmode=require` as "verify
 * the certificate against public roots", which Supabase's own CA fails. So any
 * ssl* parameters are taken off the URL, and every non-local host gets TLS:
 * verified against BOOKING_DATABASE_CA (Supabase's CA certificate, PEM) when
 * that is set, otherwise encrypted without verification, which is what libpq's
 * own sslmode=require means.
 */
export function poolConfig(raw: string, caPem?: string): {
  connectionString: string;
  ssl: false | { rejectUnauthorized: boolean; ca?: string };
} {
  const url = new URL(raw);
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith("ssl") || key === "uselibpqcompat") url.searchParams.delete(key);
  }
  const local = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname);
  const ca = caPem?.replace(/\\n/g, "\n").trim();
  return {
    connectionString: url.toString(),
    ssl: local ? false : ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: false },
  };
}
