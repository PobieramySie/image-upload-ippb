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

  const uploadedUrls = [];

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

    file.pipe(blobStream);

    blobStream.on('error', err => {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Upload error' });
    });

    blobStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      uploadedUrls.push(publicUrl);
    });
  });

  bb.on('close', () => {
    res.status(200).json({ urls: uploadedUrls });
  });

  req.pipe(bb);
});
