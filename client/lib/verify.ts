import jsQR from "jsqr";

export type RegistryRecord = {
  certificateNumber: string;
  hashHex: string;
  name: string;
  institution: string;
  course: string;
  year: number;
};

export type VerificationResult = {
  status: "valid" | "suspect" | "invalid";
  issues: string[];
  metadata: {
    fileName: string;
    size: number;
    mime: string;
    hashHex: string;
    qrData?: string;
  };
  matchedRecord?: RegistryRecord;
};

const MOCK_REGISTRY: RegistryRecord[] = [
  {
    certificateNumber: "JH-NU-2019-000123",
    hashHex: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", // sha256("") empty file for demo
    name: "Aarav Kumar",
    institution: "Nilamber-Pitamber University",
    course: "B.Sc",
    year: 2019,
  },
  {
    certificateNumber: "JH-RU-2021-004567",
    hashHex: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", // unmatched sample
    name: "Ishita Singh",
    institution: "Ranchi University",
    course: "B.Tech",
    year: 2021,
  },
  // Duplicate number scenario with different hash to simulate cloning
  {
    certificateNumber: "JH-RU-2021-004567",
    hashHex: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    name: "Ishita Singh",
    institution: "Ranchi University",
    course: "B.Tech",
    year: 2021,
  },
];

export async function analyzeFile(file: File): Promise<VerificationResult> {
  const arrayBuffer = await file.arrayBuffer();
  const hashHex = await sha256Hex(arrayBuffer);

  const base: VerificationResult = {
    status: "invalid",
    issues: [],
    metadata: {
      fileName: file.name,
      size: file.size,
      mime: file.type || "",
      hashHex,
    },
  };

  // QR (for images only)
  if (file.type.startsWith("image/")) {
    try {
      const qr = await readQrFromImage(file);
      if (qr) base.metadata.qrData = qr;
    } catch (e) {
      base.issues.push("Failed to read QR code from image");
    }
  }

  // Try to infer certificate number from filename or QR
  const fromName = extractCertificateNumber(file.name);
  const fromQr = base.metadata.qrData
    ? extractCertificateNumber(base.metadata.qrData)
    : null;
  const certificateNumber = fromQr || fromName;

  // Cross-verify against registry
  const directHashMatch = MOCK_REGISTRY.find((r) => r.hashHex === hashHex);
  const numberMatches = certificateNumber
    ? MOCK_REGISTRY.filter((r) => r.certificateNumber === certificateNumber)
    : [];

  const issues: string[] = [];
  let status: VerificationResult["status"] = "invalid";
  let matchedRecord: RegistryRecord | undefined = undefined;

  if (directHashMatch) {
    matchedRecord = directHashMatch;
    status = "valid";
  } else if (numberMatches.length > 0) {
    matchedRecord = numberMatches[0];
    status = "suspect";
    issues.push(
      "Certificate number found but file hash does not match registry record",
    );
    if (numberMatches.length > 1) {
      issues.push(
        "Duplicate certificate number detected in registry (possible clone)",
      );
    }
  } else {
    // No match at all
    status = "suspect";
    issues.push(
      "No registry match. Please contact issuing institution for manual validation",
    );
  }

  // Heuristics: basic mime check
  if (!file.type) issues.push("Missing file type metadata");
  if (file.size === 0) issues.push("Empty file content");

  return {
    ...base,
    status,
    issues,
    matchedRecord,
  };
}

export async function sha256Hex(buf: ArrayBuffer) {
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function extractCertificateNumber(
  input: string | null | undefined,
): string | null {
  if (!input) return null;
  // Very loose pattern like JH-XX-YYYY-NNNNNN
  const m = input.match(/JH-[A-Z]{2}-\d{4}-\d{6,}/i);
  return m ? m[0].toUpperCase() : null;
}

async function readQrFromImage(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  const useOffscreen = typeof OffscreenCanvas !== "undefined";
  if (useOffscreen) {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    return code?.data || null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  return code?.data || null;
}
