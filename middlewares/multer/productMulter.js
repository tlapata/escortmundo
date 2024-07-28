import multer from 'multer';
import fs from 'fs';


const isImage = (type) => {
  const mimeTypes = ["image/jpeg", "image/png"];
  return mimeTypes.includes(type);
};

// Function to sanitize filenames
const sanitizeFilename = (filename) => {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-'); // Replace multiple hyphens with a single one
};

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    
    let path;
    if (isImage(file.mimetype)) {
      path = "./public/uploads";
    }

    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
    }
    callback(null, path);
  },
  filename: (req, file, cb) => {
    const sanitizedFilename = sanitizeFilename(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}-${sanitizedFilename}`); // File naming
  },
});

const Upload = multer({
  storage: storage,
  fileFilter(req, file, cb) {
    if (!isImage(file.mimetype)) {
      cb(new Error("Only upload files with jpg or jpeg format."));
    }
    cb(undefined, true);
  },
});

export default Upload;