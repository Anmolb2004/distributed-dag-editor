const AUTH_KEY = process.env.NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY;

interface TransloaditResult {
  url: string;
  name: string;
  ssl_url: string;
  mime: string;
}

/**
 * Upload a file to Transloadit using the /assemblies endpoint.
 * Returns the uploaded file URL.
 */
export async function uploadToTransloadit(
  file: File,
  type: "image" | "video"
): Promise<string> {
  if (!AUTH_KEY) {
    // Fallback: return a local object URL when no Transloadit key
    return URL.createObjectURL(file);
  }

  const allowedTypes =
    type === "image"
      ? ["image/jpeg", "image/png", "image/webp", "image/gif"]
      : ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];

  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}`);
  }

  const formData = new FormData();
  formData.append("file", file);

  // Pass-through step using /file/filter: accepts everything, no
  // external storage credentials required. The filtered file is
  // exposed as a result on Transloadit's tmp CDN (~24h URL).
  const params = {
    auth: { key: AUTH_KEY },
    steps: {
      passthrough: {
        robot: "/file/filter",
        use: ":original",
        accepts: [["${file.size}", ">=", 0]],
        result: true,
      },
    },
  };

  formData.append("params", JSON.stringify(params));

  const res = await fetch("https://api2.transloadit.com/assemblies", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Transloadit upload failed: ${res.status} ${text || res.statusText}`);
  }

  const data = await res.json();

  // Poll until the assembly completes, then grab the result URL.
  if (data.assembly_ssl_url) {
    const result = await pollAssembly(data.assembly_ssl_url);
    const passthrough = result.results?.passthrough as TransloaditResult[] | undefined;
    if (passthrough?.[0]?.ssl_url) {
      return passthrough[0].ssl_url;
    }
    const original = result.results?.[":original"] as TransloaditResult[] | undefined;
    if (original?.[0]?.ssl_url) {
      return original[0].ssl_url;
    }
    const uploads = (result.uploads as TransloaditResult[] | undefined) ?? [];
    if (uploads[0]?.ssl_url) {
      return uploads[0].ssl_url;
    }
  }

  // Last-resort fallback for local dev
  return URL.createObjectURL(file);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function pollAssembly(url: string, maxAttempts = 30): Promise<Record<string, any>> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const res = await fetch(url);
    const data = await res.json();
    if (data.ok === "ASSEMBLY_COMPLETED") return data;
    if (data.error) throw new Error(data.error);
  }
  throw new Error("Transloadit assembly timed out");
}
