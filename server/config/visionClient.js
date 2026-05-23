const vision = require('@google-cloud/vision');
const path = require('path');

// Path to the service account key file
const keyFilename = path.join(__dirname, '../secrets/vision-api.json');

const client = new vision.ImageAnnotatorClient({
  keyFilename: keyFilename
});

module.exports = client;
