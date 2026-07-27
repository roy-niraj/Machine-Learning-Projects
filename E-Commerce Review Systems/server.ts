import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON parser for incoming requests
app.use(express.json());

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("Warning: GEMINI_API_KEY environment variable is not defined.");
}

// Helper to check for API key
function getAIClient() {
  if (!ai) {
    throw new Error("Gemini API is not configured. Please set the GEMINI_API_KEY in Settings > Secrets.");
  }
  return ai;
}

// Endpoint 1: Generate synthetic review dataset using Gemini
app.post("/api/generate-reviews", async (req, res) => {
  try {
    const { category, count = 10 } = req.body;
    if (!category) {
      return res.status(400).json({ error: "Product category is required" });
    }

    const client = getAIClient();
    const prompt = `Generate exactly ${count} realistic customer reviews for an e-commerce product in the category: "${category}". 
The reviews must have varying sentiment. Provide exactly:
- Around 4 positive reviews (ratings 4-5 stars)
- Around 3 neutral reviews (rating 3 stars)
- Around 3 negative reviews (ratings 1-2 stars)

Each review object must include:
1. "id" (unique string or number)
2. "author" (a realistic name)
3. "rating" (integer from 1 to 5)
4. "text" (the review body, 1-3 sentences)
5. "productName" (realistic product name in this category)
6. "date" (a date in ISO format in the last 6 months)
7. "trueSentiment" (either "positive", "neutral", or "negative")

Return your response strictly in JSON format as an array of these objects.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              author: { type: Type.STRING },
              rating: { type: Type.INTEGER },
              text: { type: Type.STRING },
              productName: { type: Type.STRING },
              date: { type: Type.STRING },
              trueSentiment: { type: Type.STRING, description: "Must be 'positive', 'neutral', or 'negative'" }
            },
            required: ["id", "author", "rating", "text", "productName", "date", "trueSentiment"]
          }
        }
      }
    });

    const reviewsText = response.text;
    if (!reviewsText) {
      throw new Error("No response text received from Gemini");
    }

    const reviews = JSON.parse(reviewsText.trim());
    res.json({ reviews });
  } catch (error: any) {
    console.error("Error generating reviews:", error);
    res.status(500).json({ error: error.message || "Failed to generate reviews" });
  }
});

// Endpoint 2: Single review sentiment comparison with LLM
app.post("/api/compare-sentiment", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Review text is required" });
    }

    const client = getAIClient();
    const prompt = `Analyze the sentiment of the following customer review and categorize it into exactly one of these scales: "positive", "neutral", or "negative".
Also provide a short rationale (1 sentence) for your classification and confidence score (between 0.0 and 1.0).

Review text: "${text}"`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: { type: Type.STRING, description: "Must be 'positive', 'neutral', or 'negative'" },
            confidence: { type: Type.NUMBER, description: "Confidence score from 0.0 to 1.0" },
            rationale: { type: Type.STRING, description: "A brief 1-sentence explanation of why" }
          },
          required: ["sentiment", "confidence", "rationale"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response text received from Gemini");
    }

    const analysis = JSON.parse(resultText.trim());
    res.json(analysis);
  } catch (error: any) {
    console.error("Error analyzing review:", error);
    res.status(500).json({ error: error.message || "Failed to analyze sentiment" });
  }
});

// Setup Vite Dev Server / Static Assets
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

start();
