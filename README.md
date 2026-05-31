# FutureMe - AI Self-Reflection

FutureMe is a premium, AI-powered personal reflection web application. Users enter details about their goals, struggles, and ambitions, and receive a deeply emotional, intelligent, and actionable message from their future successful self using the Gemini API.

Built for **Nitish's Founder Labs** live demonstration.

## Features

- **Identity Engine**: Parameters for Goal, Current Struggle, One-Year Vision, and Tone.
- **Tone Personalization**: Motivational, Brutally Honest, Calm Mentor, and CEO Mode.
- **Continuous Guidance**: Interactive chat with the generated FutureMe identity retaining context.
- **Apple-Style Design**: Premium glassmorphic interface, dark aesthetics, smooth micro-interactions, and toast alerts.
- **XSS Resistant**: Designed with strict secure coding practices (DOM manipulation using safe APIs and zero `innerHTML` usage).

---

## Getting Started

Follow these steps to run the project locally.

### 1. Prerequisite
Ensure you have Node.js and NPM installed.

### 2. Installation
Navigate to the backend directory and install the necessary dependencies:

```bash
cd backend
npm install
```

### 3. Add Gemini API Key
Create a `.env` file inside the `backend` directory (using `.env.example` as a template) and add your Gemini API Key:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=5000
```

### 4. Run the Backend
Start the server in development mode (using nodemon):

```bash
npm run dev
```

The server will run securely at `http://127.0.0.1:5000`.

### 5. Open the Frontend
Once the backend server is running, open your web browser and navigate to:
`http://127.0.0.1:5000`

The Express server serves the static frontend assets automatically!

---

## API Routes Documentation

The backend server exposes the following endpoints:

### 1. POST `/api/generate-futureme`
Generates the initial reflection message.
- **Request Body**:
  ```json
  {
    "name": "Nitish",
    "age": "23",
    "goal": "Build a successful AI startup",
    "struggle": "Lack of consistency",
    "oneYearVision": "Running a profitable AI company",
    "tone": "Brutally Honest"
  }
  ```
- **Response JSON**:
  ```json
  {
    "success": true,
    "data": {
      "message": "Hey Nitish, I am the version of you who did not quit...",
      "futureIdentity": "A relentless executor who thrives in ambiguity.",
      "nextMoves": ["Ship the MVP this week.", "Talk to 5 potential users.", "Document publicly."],
      "habit": "Write down one win and one lesson every evening.",
      "warning": "Do not trade your daily consistency for cheap dopamine.",
      "mantra": "Action overrides anxiety."
    }
  }
  ```

### 2. POST `/api/chat-futureme`
Continues the reflection in an interactive chat session.
- **Request Body**:
  ```json
  {
    "userProfile": { ... },
    "chatHistory": [
      { "role": "futureme", "message": "..." }
    ],
    "question": "What should I focus on this week?"
  }
  ```
- **Response JSON**:
  ```json
  {
    "success": true,
    "reply": "Focus purely on shipping. Eliminate any feature that does not contribute to the core loop."
  }
  ```
