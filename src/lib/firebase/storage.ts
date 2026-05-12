import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./config";

export interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
}

export interface UploadResult {
  url: string;
  path: string;
}

const MAX_FILE_SIZE_ATTACHMENT = 8 * 1024 * 1024; // 8MB
const MAX_FILE_SIZE_LOGO = 2 * 1024 * 1024; // 2MB

const ALLOWED_ATTACHMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

const ALLOWED_LOGO_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

export function validateFile(
  file: File,
  type: "attachment" | "logo"
): { valid: boolean; error?: string } {
  const maxSize = type === "attachment" ? MAX_FILE_SIZE_ATTACHMENT : MAX_FILE_SIZE_LOGO;
  const allowedTypes = type === "attachment" ? ALLOWED_ATTACHMENT_TYPES : ALLOWED_LOGO_TYPES;

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size must be less than ${maxSize / 1024 / 1024}MB`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  return { valid: true };
}

export function generateStoragePath(
  type: "attachment" | "logo",
  clientId: string,
  fileName: string,
  requestId?: string
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");

  if (type === "attachment" && requestId) {
    return `attachments/${clientId}/${requestId}/${timestamp}_${sanitizedFileName}`;
  } else if (type === "logo") {
    return `logos/${clientId}/${timestamp}_${sanitizedFileName}`;
  }

  throw new Error("Invalid storage path parameters");
}

export async function uploadFile(
  file: File,
  path: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.({
          progress,
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
        });
      },
      (error) => {
        console.error("Upload error:", error);
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url: downloadURL,
            path: uploadTask.snapshot.ref.fullPath,
          });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

export async function deleteFile(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}
