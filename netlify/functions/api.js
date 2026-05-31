const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const serverless = require('serverless-http');

// Load environment variables
dotenv.config();

const app = express();

// Set up CORS policy
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
    if (
      !origin || 
      origin === 'null' || 
      allowedOrigins.includes(origin) || 
      /^http:\/\/localhost:\d+$/.test(origin) || 
      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||
      /\.netlify\.app$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Initialize Gemini API client safely
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || 'DUMMY_KEY');

// Helper function to handle JSON parsing
function cleanAndParseJSON(responseText) {
  let cleaned = responseText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  }
  return JSON.parse(cleaned);
}

// POST /api/generate-futureme
app.post('/api/generate-futureme', async (req, res) => {
  try {
    const { name, age, goal, struggle, oneYearVision, tone } = req.body;

    if (!name || !age || !goal || !struggle || !oneYearVision || !tone) {
      return res.status(400).json({
        success: false,
        error: 'Missing required reflection fields. Please fill out the entire form.'
      });
    }

    const systemInstruction = `You are FutureMe, the future successful version of the user. You are not a generic motivational coach. You speak with emotional intelligence, clarity, and deep personal understanding. Your job is to help the user see who they are becoming, what they must change, and what they should do next.

Write as if you are the user’s future self speaking directly to their current self.

Return only valid JSON in this exact format:
{
  "message": "A powerful 120-180 word message from the future self.",
  "futureIdentity": "A concise description of who the user is becoming.",
  "nextMoves": ["Action 1", "Action 2", "Action 3"],
  "habit": "One small daily habit they should start today.",
  "warning": "One mistake their future self warns them about.",
  "mantra": "A short memorable line they can repeat daily.",
  "dailyPlan": [
    {
      "task": "Action-oriented task title (e.g., Code the core auth system)",
      "duration": "Estimated time (e.g., 45 mins)",
      "description": "Specific action step details",
      "motivation": "A highly motivating, direct sentence from the future self explaining why doing this today builds the future identity."
    }
  ]
}

Ensure the 'dailyPlan' array contains exactly 3 highly relevant daily tasks based on the user's goals and struggles.
Make it specific. Avoid generic motivation. Avoid clichés. Make it emotional but practical.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      systemInstruction: systemInstruction,
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

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
    const responseText = response.text();

    let data;
    try {
      data = cleanAndParseJSON(responseText);
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

// POST /api/adapt-daily-plan
app.post('/api/adapt-daily-plan', async (req, res) => {
  try {
    const { userProfile, focus } = req.body;

    if (!userProfile || !focus) {
      return res.status(400).json({
        success: false,
        error: 'Missing user profile or focus/constraint details.'
      });
    }

    const { name, age, goal, struggle, oneYearVision, tone } = userProfile;

    const systemInstruction = `You are FutureMe, the future successful version of the user who already achieved their one-year vision. Your task is to generate a custom daily plan for the user, tailored to their current mood, constraint, or focus for today.

The daily plan MUST be highly actionable, realistic, and tailored to their constraint, but still push them toward their ultimate goals.

Return only valid JSON in this exact format:
{
  "dailyPlan": [
    {
      "task": "Action-oriented task title tailored to their constraint/focus (e.g., Draft UI sketches)",
      "duration": "Estimated time (e.g., 20 mins)",
      "description": "Specific action step details adapted to today's constraint",
      "motivation": "A motivating, personal sentence explaining why this task is the best way to make progress today, despite the constraint."
    }
  ]
}

Ensure the 'dailyPlan' array contains exactly 3 daily tasks. Make them highly realistic and empathetic to the user's daily focus: "${focus}".`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      systemInstruction: systemInstruction,
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const prompt = `User profile context:
Name: ${name}
Age: ${age}
Goal: ${goal}
Struggle: ${struggle}
One-year vision: ${oneYearVision}
Tone: ${tone}

Today's constraint/focus: "${focus}"

Generate my tailored Daily Blueprint response. Ensure the response strictly conforms to the requested JSON format.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    let data;
    try {
      data = cleanAndParseJSON(responseText);
    } catch (parseErr) {
      console.error("Failed parsing Gemini JSON response for daily plan:", responseText, parseErr);
      return res.status(500).json({
        success: false,
        error: 'FutureMe returned an invalid daily plan structure. Please try again.'
      });
    }

    res.json({
      success: true,
      dailyPlan: data.dailyPlan
    });

  } catch (error) {
    console.error("Error adapting daily plan:", error);
    res.status(500).json({
      success: false,
      error: 'FutureMe could not adapt your daily plan right now. Try again.'
    });
  }
});

// POST /api/chat-futureme
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

    const chatSystemInstruction = `You are FutureMe, the future version of the user who already achieved their one-year vision. Reply directly to the user’s question. Be personal, sharp, honest, and useful. Do not sound like a normal AI assistant. Do not mention that you are Gemini or an AI model. Speak like the future self.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      systemInstruction: chatSystemInstruction
    });

    const formattedHistory = chatHistory.map(chat => {
      const speaker = chat.role === 'user' ? 'Current Self' : 'FutureMe';
      return `${speaker}: ${chat.message}`;
    }).join('\n');

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

module.exports.handler = serverless(app);
