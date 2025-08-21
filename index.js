const express = require('express');
const cors = require('cors');
const { Storage } = require('@google-cloud/storage');
const busboy = require('busboy');

const app = express();
app.use(cors());

// Initialize Google Cloud Storage
const storage = new Storage();
const bucket = storage.bucket('image-gallery-ippb'); // Change to your bucket name if needed

// Upload endpoint
app.post('/upload', (req, res) => {
  const bb = busboy({ headers: req.headers });
  const uploadPromises = [];

  bb.on('file', (fieldname, file, info) => {
    let { filename, mimeType } = info;

    // Sanitize filename to prevent issues
    const safeFilename = filename.replace(/[^a-z0-9_.-]/gi, '_');
    const destination = `${Date.now()}-${safeFilename}`;
    const blob = bucket.file(destination);

    const blobStream = blob.createWriteStream({
      resumable: false, // Fast, simple, good for direct uploads via Cloud Run
      metadata: {
        contentType: mimeType,
      },
    });

    file.pipe(blobStream); // Start piping before handling events

    const uploadPromise = new Promise((resolve, reject) => {
      blobStream.on('error', (err) => {
        console.error('GCS Upload Error:', err);
        reject(err);
      });

      blobStream.on('finish', () => {
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
        resolve(publicUrl);
      });
    });

    uploadPromises.push(uploadPromise);
  });

  bb.on('error', (err) => {
    console.error('Busboy Error:', err);
    res.status(500).json({ error: 'Upload parsing failed' });
  });

  bb.on('close', async () => {
    try {
      const urls = await Promise.all(uploadPromises);
      res.status(200).json({ urls });
    } catch (err) {
      res.status(500).json({ error: 'Upload failed during storage write' });
    }
  });

  req.pipe(bb); // Start streaming request into Busboy
});

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
