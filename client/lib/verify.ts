import jsQR from "jsqr";
import { apiClient, type VerificationResponse, type OCRResponse, type UploadResponse } from "@/shared/api";

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
    uploadId?: string;
    ocrText?: string;
    backendVerification?: VerificationResponse;
  };
  matchedRecord?: RegistryRecord;
};

// Fallback mock registry for offline mode
const MOCK_REGISTRY: RegistryRecord[] = [
  {
    certificateNumber: "JH-NU-2019-000123",
    hashHex: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    name: "Aarav Kumar",
    institution: "Nilamber-Pitamber University",
    course: "B.Sc",
    year: 2019,
  },
  {
    certificateNumber: "JH-RU-2021-004567",
    hashHex: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
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

  // QR code extraction (local)
  if (file.type.startsWith("image/")) {
    try {
      const qr = await readQrFromImage(file);
      if (qr) base.metadata.qrData = qr;
    } catch (e) {
      base.issues.push("Failed to read QR code from image");
    }
  }

  // Try backend verification first
  try {
    console.log("🚀 Attempting backend verification...");
    
    // Step 1: Upload file to backend
    const uploadResult: UploadResponse = await apiClient.uploadCertificate(file);
    base.metadata.uploadId = uploadResult.id;
    console.log("✅ File uploaded:", uploadResult);

    // Step 2: Extract text via OCR (if image)
    if (file.type.startsWith("image/")) {
      try {
        const ocrResult: OCRResponse = await apiClient.extractText(file);
        base.metadata.ocrText = ocrResult.extracted_text;
        console.log("✅ OCR completed:", ocrResult);
      } catch (ocrError) {
        console.warn("⚠️ OCR failed:", ocrError);
        base.issues.push("OCR text extraction failed");
      }
    }

    // Step 3: Verify certificate
    const verificationResult: VerificationResponse = await apiClient.verifyCertificate(uploadResult.id);
    base.metadata.backendVerification = verificationResult;
    console.log("✅ Backend verification:", verificationResult);

    // Use backend results
    base.status = verificationResult.status;
    base.issues = [...base.issues, ...verificationResult.issues];
    
    if (verificationResult.matched_record) {
      base.matchedRecord = {
        certificateNumber: verificationResult.matched_record.certificate_number,
        hashHex: hashHex,
        name: verificationResult.matched_record.name,
        institution: verificationResult.matched_record.institution,
        course: verificationResult.matched_record.course,
        year: verificationResult.matched_record.year,
      };
    }

    return base;

  } catch (backendError) {
    console.warn("⚠️ Backend verification failed, falling back to local verification:", backendError);
    base.issues.push("Backend verification unavailable - using local verification");
    
    // Fallback to local verification
    return await localVerification(base, file);
  }
}

// Local verification fallback
async function localVerification(base: VerificationResult, file: File): Promise<VerificationResult> {
  // Try to infer certificate number from filename or QR
  const fromName = extractCertificateNumber(file.name);
  const fromQr = base.metadata.qrData
    ? extractCertificateNumber(base.metadata.qrData)
    : null;
  const certificateNumber = fromQr || fromName;

  // Cross-verify against mock registry
  const directHashMatch = MOCK_REGISTRY.find((r) => r.hashHex === base.metadata.hashHex);
  const numberMatches = certificateNumber
    ? MOCK_REGISTRY.filter((r) => r.certificateNumber === certificateNumber)
    : [];

  const issues: string[] = [...base.issues];
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
    status = "suspect";
    issues.push(
      "No registry match. Please contact issuing institution for manual validation",
    );
  }

  // Basic validation
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
