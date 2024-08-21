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

// Function to generate filename not max 255 symbols
const generateFilename = (file) => {
  const fieldname = file.fieldname;
  const timestamp = Date.now();
  const sanitizedFilename = sanitizeFilename(file.originalname);
  const maxFilenameLength = 255 - (fieldname.length + timestamp.toString().length + 6); // +2 for the hyphens

  let truncatedFilename = sanitizedFilename;
  
  if (truncatedFilename.length > maxFilenameLength) {
    truncatedFilename = truncatedFilename.substring(0, maxFilenameLength);
  }

  return `${fieldname}-${timestamp}-${truncatedFilename}`;
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
    //const sanitizedFilename = sanitizeFilename(file.originalname);
    const finalFilename = generateFilename(file);
    cb(null, finalFilename);
    //cb(null, `${file.fieldname}-${Date.now()}-${sanitizedFilename}`); // File naming
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