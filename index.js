const express = require('express');
const cors = require('cors');
const { Storage } = require('@google-cloud/storage');
const busboy = require('busboy');

const app = express();
app.use(cors());

const storage = new Storage();
const bucket = storage.bucket('image-gallery-ippb');

// Upload endpoint using Busboy (streaming parser)
app.post('/upload', (req, res) => {
  const bb = busboy({ headers: req.headers });
  const uploadPromises = [];

  bb.on('file', (fieldname, file, info) => {
    const { filename, mimeType } = info;
    const destination = `${Date.now()}-${filename}`;
    const blob = bucket.file(destination);

    const blobStream = blob.createWriteStream({
      resumable: true,
      metadata: {
        contentType: mimeType,
      },
    });

    const uploadPromise = new Promise((resolve, reject) => {
      blobStream.on('error', (err) => {
        console.error('GCS Upload Error:', err);
        reject(err);
      });

      blobStream.on('finish', () => {
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
        resolve(publicUrl);
      });

      file.pipe(blobStream);
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

  req.pipe(bb);
});


// START THE SERVER
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
