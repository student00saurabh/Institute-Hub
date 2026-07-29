const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "thecubicals",
    allowedFormats: ["png", "jpg", "jpeg", "svg", "webp"],
    transformation: [
      {
        quality: "auto",
        fetch_format: "auto",
      },
    ],
  },
});

module.exports = {
  cloudinary,
  storage,
};


// ============================================================
// VIDEO STORAGE — private / "authenticated" delivery type.
// ⚠️ This is the important part for security: videos uploaded with
// type: "authenticated" can NEVER be fetched from Cloudinary with a
// plain URL, even if someone finds/guesses the public_id. Every single
// request MUST carry a valid Cloudinary signature + expiry timestamp,
// which is exactly what lectureController's generateSecureVideoUrl()
// produces. This is what makes "copy the link and it goes dead after
// some time" actually enforceable at the Cloudinary level, not just in
// our own app.
// ============================================================
const videoStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "institutehub/lectures/videos",
        resource_type: "video",
        type: "authenticated", // 🔒 private delivery — requires a signed URL to play
        allowed_formats: ["mp4", "mov", "webm", "mkv", "avi"],
    },
});

module.exports = { cloudinary, storage, videoStorage };