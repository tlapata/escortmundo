import fs from 'fs';
import axios from 'axios';

// Function to upload the file
async function uploadToS3(presignedUrl, filePath, fileMime) {
  try {
    // Read the file from the file path
    const fileData = fs.readFileSync(filePath);

    // Upload the file to S3 using the presigned URL
    const response = await axios.put(presignedUrl, fileData, {
      headers: {
        'Content-Type': fileMime 
      }
    });

    console.log('File uploaded successfully', response.status);

    // Delete the file from the local file system
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Error deleting the file:', err);
      } else {
        console.log('File deleted successfully from local file system');
      }
    });

  } catch (error) {
    console.error('Error uploading file:', error);
  }
}

export { uploadToS3 };