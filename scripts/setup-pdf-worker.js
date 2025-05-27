const fs = require('fs');
const https = require('https');
const path = require('path');

const workerUrl = 'https://unpkg.com/pdfjs-dist@latest/build/pdf.worker.min.js';
const outputPath = path.join(__dirname, '..', 'public', 'pdf.worker.min.js');

// Ensure the public directory exists
if (!fs.existsSync(path.join(__dirname, '..', 'public'))) {
  fs.mkdirSync(path.join(__dirname, '..', 'public'));
}

// Download the worker file
https.get(workerUrl, (response) => {
  const file = fs.createWriteStream(outputPath);
  response.pipe(file);

  file.on('finish', () => {
    file.close();
    console.log('PDF.js worker downloaded successfully!');
  });
}).on('error', (err) => {
  console.error('Error downloading PDF.js worker:', err.message);
  process.exit(1);
}); 