const fs = require("fs");
const path = require("path");

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/**
 * Saves multipart file under uploads/<subfolder>/...
 * Returns relative path without leading slash: uploads/artists/1/profile/x.jpg
 */
const saveUploadedFile = (file, subfolder = "misc") =>
  new Promise((resolve, reject) => {
    const cleanFolder = String(subfolder || "misc")
      .replace(/\.\./g, "")
      .replace(/^\/+|\/+$/g, "");
    const uploadRoot = path.join(__dirname, "../../uploads", cleanFolder);
    ensureDir(uploadRoot);

    const original = String(file.name || "file").replace(/\s+/g, "_");
    const safeName = `${Date.now()}-${original}`;
    const dest = path.join(uploadRoot, safeName);

    file.mv(dest, (err) => {
      if (err) return reject(err);
      const relativePath = `uploads/${cleanFolder}/${safeName}`.replace(
        /\\/g,
        "/"
      );
      resolve({
        filename: safeName,
        path: relativePath,
        mimetype: file.mimetype,
        size: file.size,
      });
    });
  });

const saveBase64File = (base64, subfolder = "misc", filename = "file.jpg") => {
  const cleanFolder = String(subfolder || "misc")
    .replace(/\.\./g, "")
    .replace(/^\/+|\/+$/g, "");
  const uploadRoot = path.join(__dirname, "../../uploads", cleanFolder);
  ensureDir(uploadRoot);

  const cleaned = String(base64 || "")
    .replace(/^data:[^;]+;base64,/i, "")
    .replace(/\s/g, "");
  const buffer = Buffer.from(cleaned, "base64");
  const safeName = `${Date.now()}-${String(filename).replace(/\s+/g, "_")}`;
  const dest = path.join(uploadRoot, safeName);
  fs.writeFileSync(dest, buffer);
  const relativePath = `uploads/${cleanFolder}/${safeName}`.replace(/\\/g, "/");
  return {
    filename: safeName,
    path: relativePath,
    mimetype: "image/jpeg",
    size: buffer.length,
  };
};

module.exports = {
  ensureDir,
  saveUploadedFile,
  saveBase64File,
};
