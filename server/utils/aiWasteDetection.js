const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

/**
 * Analyzes an image using Google Gemini (1.5-flash)
 * @param {String|Buffer} imageInput - URL or Buffer of the image
 * @param {String} selectedType - The waste type selected by the citizen
 * @returns {Object} - Detection results
 */
const detectFakeWaste = async (imageInput, selectedType) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is missing');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let imageBase64;
    let mimeType = 'image/jpeg';

    if (Buffer.isBuffer(imageInput)) {
      imageBase64 = imageInput.toString('base64');
    } else if (typeof imageInput === 'string' && imageInput.startsWith('http')) {
      const response = await axios.get(imageInput, { responseType: 'arraybuffer' });
      imageBase64 = Buffer.from(response.data, 'binary').toString('base64');
      // Try to get mime type from response or keep default
      const contentType = response.headers['content-type'];
      if (contentType) mimeType = contentType;
    } else if (typeof imageInput === 'string' && imageInput.startsWith('data:image')) {
      // Handle base64 data URI if passed
      const parts = imageInput.split(';base64,');
      imageBase64 = parts.pop();
      mimeType = parts[0].split(':')[1];
    } else {
      throw new Error('Invalid image input provided to AI');
    }

    const prompt = `You are a specialized Waste Verification AI for the EcoLoop platform.
Analyze this image carefully. Your goal is to detect if this is a GENUINE report of physical waste or if it's a fake/garbage/internet image.

THE CITIZEN SELECTED: "${selectedType}"

Rules for analysis:
1. WASTE TYPE MATCH: Does the image show the type of waste selected? (e.g., if "Plastic Waste" is selected, do you see plastic bottles/bags?)
2. DETECT FAKES: Is this image AI-generated, a screenshot, a meme, a cartoon, an edited photo, or a stock photo from the internet?
3. QUALITY: Is the image too blurry, dark, or blank to identify waste?
4. NON-WASTE: Is the image a photo of a clean room, a person, or something that is NOT trash?

Respond ONLY with a JSON object in this format:
{
  "aiVerified": boolean,
  "aiStatus": "APPROVED" | "REJECTED" | "SUSPICIOUS" | "PENDING_VERIFICATION",
  "aiDetectedLabels": string[],
  "aiConfidenceScore": number,
  "fakeProbabilityScore": number,
  "rejectionReason": "brief explanation",
  "duplicateImage": boolean,
  "aiGeneratedDetected": boolean
}

Faking indicators:
- Cartoon/meme -> +80 fake score
- Clean/stock photo -> +60 fake score
- Doesn't match selected type -> +40 fake score
- Blurry/blank -> +30 fake score

If total fake score > 60, status must be REJECTED.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageBase64, mimeType } },
    ]);

    const rawText = result.response.text().trim();
    const cleanJson = rawText.replace(/```json|```/gi, '').trim();
    
    const parsed = JSON.parse(cleanJson);

    return {
      aiVerified: !!parsed.aiVerified,
      aiStatus: parsed.aiStatus || 'PENDING_VERIFICATION',
      aiDetectedLabels: parsed.aiDetectedLabels || [],
      aiConfidenceScore: parsed.aiConfidenceScore || 0,
      fakeProbabilityScore: parsed.fakeProbabilityScore || 0,
      rejectionReason: parsed.rejectionReason || '',
      duplicateImage: !!parsed.duplicateImage,
      aiGeneratedDetected: !!parsed.aiGeneratedDetected
    };

  } catch (error) {
    console.error('AI Detection Error (Gemini):', error);
    return {
      aiVerified: false,
      aiStatus: 'PENDING_VERIFICATION',
      aiDetectedLabels: [],
      aiConfidenceScore: 0,
      fakeProbabilityScore: 0,
      rejectionReason: 'AI analysis failed. Manual verification required.',
      duplicateImage: false,
      aiGeneratedDetected: false
    };
  }
};

module.exports = { detectFakeWaste };
