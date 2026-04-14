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

  const params = {
    auth: { key: AUTH_KEY },
    steps: {
      store: {
        robot: "/s3/store",
        use: ":original",
        credentials: "s3_credentials",
      },
    },
  };

  formData.append("params", JSON.stringify(params));

  const res = await fetch("https://api2.transloadit.com/assemblies", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Transloadit upload failed: ${res.statusText}`);
  }

  const data = await res.json();

  // Poll for completion
  if (data.assembly_ssl_url) {
    const result = await pollAssembly(data.assembly_ssl_url);
    const uploads = result.results?.[":original"] as TransloaditResult[] | undefined;
    if (uploads?.[0]?.ssl_url) {
      return uploads[0].ssl_url;
    }
  }

  // Fallback: use tus_url or the assembly URL
  return data.uploads?.[0]?.ssl_url ?? URL.createObjectURL(file);
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
