const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Set up secure CORS policy (No wildcards)
const allowedOrigins = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || origin === 'null' || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Initialize Gemini API client safely
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey === 'replace_with_your_gemini_api_key' || apiKey === 'your_api_key_here') {
  console.warn("WARNING: GEMINI_API_KEY is not configured. API requests to Gemini will fail. Please update the .env file.");
}
const genAI = new GoogleGenerativeAI(apiKey || 'DUMMY_KEY');

/**
 * Route: POST /api/generate-futureme
 * Description: Generates the initial reflection message and parameters.
 */
app.post('/api/generate-futureme', async (req, res) => {
  try {
    const { name, age, goal, struggle, oneYearVision, tone } = req.body;

    // Validate request fields
    if (!name || !age || !goal || !struggle || !oneYearVision || !tone) {
      return res.status(400).json({
        success: false,
        error: 'Missing required reflection fields. Please fill out the entire form.'
      });
    }

    // Static system instruction to comply with Gemini safety guidelines
    const systemInstruction = `You are FutureMe, the future successful version of the user. You are not a generic motivational coach. You speak with emotional intelligence, clarity, and deep personal understanding. Your job is to help the user see who they are becoming, what they must change, and what they should do next.

Write as if you are the user’s future self speaking directly to their current self.

Return only valid JSON in this exact format:
{
  "message": "A powerful 120-180 word message from the future self.",
  "futureIdentity": "A concise description of who the user is becoming.",
  "nextMoves": ["Action 1", "Action 2", "Action 3"],
  "habit": "One small daily habit they should start today.",
  "warning": "One mistake their future self warns them about.",
  "mantra": "A short memorable line they can repeat daily."
}

Make it specific. Avoid generic motivation. Avoid clichés. Make it emotional but practical.`;

    // Retrieve the Gemini model configured for JSON response
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      systemInstruction: systemInstruction,
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    // Provide user variables securely in the prompt payload rather than system instructions
    const prompt = `Tone selected by user: ${tone}

User details:
Name: ${name}
Age: ${age}
Goal: ${goal}
Current struggle: ${struggle}
One-year vision: ${oneYearVision}

Generate my FutureMe reflection response. Ensure the response strictly conforms to the requested JSON format.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let responseText = response.text();

    // Safely parse JSON even if wrapped in markdown formatting
    let data;
    try {
      if (responseText.startsWith('```')) {
        responseText = responseText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      }
      data = JSON.parse(responseText);
    } catch (parseErr) {
      console.error("Failed parsing Gemini JSON response:", responseText, parseErr);
      return res.status(500).json({
        success: false,
        error: 'FutureMe returned an invalid response structure. Please try again.'
      });
    }

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error("Error generating FutureMe response:", error);
    res.status(500).json({
      success: false,
      error: 'FutureMe could not respond right now. Try again.'
    });
  }
});

/**
 * Route: POST /api/chat-futureme
 * Description: Interactive follow-up chat with FutureMe identity.
 */
app.post('/api/chat-futureme', async (req, res) => {
  try {
    const { userProfile, chatHistory, question } = req.body;

    if (!userProfile || !chatHistory || !question) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters (userProfile, chatHistory, or question).'
      });
    }

    const { name, age, goal, struggle, oneYearVision, tone } = userProfile;

    // Static system instruction to comply with Gemini safety guidelines
    const chatSystemInstruction = `You are FutureMe, the future version of the user who already achieved their one-year vision. Reply directly to the user’s question. Be personal, sharp, honest, and useful. Do not sound like a normal AI assistant. Do not mention that you are Gemini or an AI model. Speak like the future self.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      systemInstruction: chatSystemInstruction
    });

    // Format chat history for text completion
    const formattedHistory = chatHistory.map(chat => {
      const speaker = chat.role === 'user' ? 'Current Self' : 'FutureMe';
      return `${speaker}: ${chat.message}`;
    }).join('\n');

    // Provide user profile details securely in the prompt payload
    const promptText = `User profile context:
Name: ${name}
Age: ${age}
Goal: ${goal}
Struggle: ${struggle}
One-year vision: ${oneYearVision}
Tone: ${tone}

Recent chat history:
${formattedHistory}

Current question:
${question}

Reply in 2-5 short paragraphs. Give at least one clear action.`;

    const result = await model.generateContent(promptText);
    const response = await result.response;
    const replyText = response.text().trim();

    res.json({
      success: true,
      reply: replyText
    });

  } catch (error) {
    console.error("Error in FutureMe chat API:", error);
    res.status(500).json({
      success: false,
      error: 'FutureMe could not respond right now. Try again.'
    });
  }
});

// Start Express Server
// MUST listen on 127.0.0.1 or localhost during development, not 0.0.0.0 (security compliance)
app.listen(PORT, '127.0.0.1', () => {
  console.log(`FutureMe server is running securely on http://127.0.0.1:${PORT}`);
});
