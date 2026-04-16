/**
 * Server-side Transloadit upload for Trigger.dev tasks.
 * Uploads a buffer (from FFmpeg output) to Transloadit and returns a CDN URL.
 */

const AUTH_KEY = process.env.NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY;
const AUTH_SECRET = process.env.TRANSLOADIT_AUTH_SECRET;

export async function uploadBufferToTransloadit(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  if (!AUTH_KEY) {
    // Fallback: return base64 data URL if no Transloadit key
    const base64 = buffer.toString("base64");
    return `data:${mimeType};base64,${base64}`;
  }

  const boundary = `----FormBoundary${Date.now()}${Math.random().toString(36).slice(2)}`;

  const params = JSON.stringify({
    auth: { key: AUTH_KEY },
    steps: {
      store: {
        robot: "/s3/store",
        use: ":original",
        credentials: "s3_credentials",
      },
    },
  });

  // Build multipart form data manually (Node.js environment in Trigger.dev)
  const parts: Buffer[] = [];

  // params field
  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="params"\r\n\r\n${params}\r\n`
  ));

  // file field
  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
  ));
  parts.push(buffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  const body = Buffer.concat(parts);

  const res = await fetch("https://api2.transloadit.com/assemblies", {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Transloadit upload failed: ${res.status} ${text}`);
  }

  const data = await res.json();

  if (data.assembly_ssl_url) {
    const result = await pollAssembly(data.assembly_ssl_url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uploads = (result as any).results?.[":original"];
    if (Array.isArray(uploads) && uploads[0]?.ssl_url) {
      return uploads[0].ssl_url;
    }
  }

  // Fallback to base64 if Transloadit doesn't return a URL
  const base64 = buffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

async function pollAssembly(url: string, maxAttempts = 60): Promise<Record<string, unknown>> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(url);
    const data = await res.json();
    if (data.ok === "ASSEMBLY_COMPLETED") return data;
    if (data.error) throw new Error(`Transloadit assembly error: ${data.error}`);
  }
  throw new Error("Transloadit assembly timed out");
}
