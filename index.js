const express = require('express');
const cors = require('cors');
const { Storage } = require('@google-cloud/storage');

const app = express();
app.use(cors());
app.use(express.json()); // to parse JSON bodies

// Initialize Google Cloud Storage
const storage = new Storage();
const bucket = storage.bucket('image-gallery-ippb'); // Your bucket name

// Generate signed URL for upload
app.post('/generate-signed-url', async (req, res) => {
  try {
    const { filename, contentType } = req.body;

    if (!filename || !contentType) {
      return res.status(400).json({ error: 'Missing filename or contentType' });
    }

    // Sanitize filename (optional, but recommended)
    const safeFilename = filename.replace(/[^a-z0-9_.-]/gi, '_');
    const destination = `${Date.now()}-${safeFilename}`;
    const file = bucket.file(destination);

    const options = {
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType,
    };

    const [signedUrl] = await file.getSignedUrl(options);

    res.status(200).json({ signedUrl, publicUrl: `https://storage.googleapis.com/${bucket.name}/${destination}` });
  } catch (err) {
    console.error('Error generating signed URL:', err);
    res.status(500).json({ error: 'Could not generate signed URL' });
  }
});

// List images endpoint (unchanged)
app.get('/images', async (req, res) => {
  try {
    const [files] = await bucket.getFiles();
    const urls = files.map(file =>
      `https://storage.googleapis.com/${bucket.name}/${file.name}`
    );
    res.status(200).json(urls);
  } catch (err) {
    console.error('Error fetching images:', err);
    res.status(500).json({ error: 'Failed to list images' });
  }
});

// Start the server on the Cloud Run expected port
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
