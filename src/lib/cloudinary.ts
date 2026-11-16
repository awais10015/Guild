import { v2 as cloudinary } from "cloudinary";

export const cloudinaryEnabled = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

export interface SignedUpload {
  mode: "cloudinary";
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  uploadUrl: string;
}

/**
 * Issues a short-lived signature scoped to the user's own folder.
 * The API secret never leaves the server.
 */
export function signUpload(userId: string, kind: string): SignedUpload {
  if (!cloudinaryEnabled) throw new Error("Cloudinary is not configured");
  const folder = `guild/${userId}/${kind}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { folder, timestamp },
    process.env.CLOUDINARY_API_SECRET as string,
  );
  return {
    mode: "cloudinary",
    cloudName: process.env.CLOUDINARY_CLOUD_NAME as string,
    apiKey: process.env.CLOUDINARY_API_KEY as string,
    timestamp,
    signature,
    folder,
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
  };
}

/** Only accept image URLs we trust when persisting user-provided paths. */
export function isAllowedImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const allowed = [
      "res.cloudinary.com",
      "picsum.photos",
      "fastly.picsum.photos",
    ];
    return u.protocol === "https:" && allowed.includes(u.hostname);
  } catch {
    return false;
  }
}
