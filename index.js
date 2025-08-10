const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { Storage } = require('@google-cloud/storage');

const app = express();
app.use(cors());

// Set up Google Cloud Storage
const storage = new Storage();
const bucketName = 'my-image-gallery-bucket';
const bucket = storage.bucket(bucketName);

// Configure multer for in-memory upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// Upload endpoint
app.post('/upload', upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadPromises = req.files.map(file => {
      return new Promise((resolve, reject) => {
        const filename = `${Date.now()}-${file.originalname}`;
        const blob = bucket.file(filename);
        const blobStream = blob.createWriteStream({
          resumable: false,
          metadata: { contentType: file.mimetype },
        });

        blobStream.on('error', err => reject(err));
        blobStream.on('finish', () => {
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
          resolve(publicUrl);
        });

        blobStream.end(file.buffer);
      });
    });

    const publicUrls = await Promise.all(uploadPromises);
    res.status(200).json({ urls: publicUrls });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List images endpoint
app.get('/images', async (req, res) => {
  try {
    const [files] = await bucket.getFiles();
    const urls = files.map(
      (file) => `https://storage.googleapis.com/${bucket.name}/${file.name}`
    );
    res.status(200).json(urls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not list images' });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
