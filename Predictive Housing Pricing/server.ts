import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Prediction API Endpoint
  app.post('/api/predict', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is required.' });
      }

      const features = req.body;
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `You are a Predictive Housing Valuation Engine simulating a Scikit-Learn Gradient Boosting Regressor trained on Indian real estate data.
A user has submitted the following property features for valuation in India:
${JSON.stringify(features, null, 2)}

Calculate a realistic estimated property price in Indian Rupees (INR) based on these features (use highly realistic Indian real estate market trends, e.g., premium values for Mumbai/Delhi, lower values for smaller towns, accounting for sqft, proximity to city center in km, and macro factors).
Also, output the mock feature importance percentages (summing to 100%) for the top 5 most important features that influenced this prediction, like a Gradient Boosting model would.
Output your response STRICTLY as a JSON object with this exact structure, with NO markdown formatting, NO backticks, and NO additional text:
{
  "estimatedPrice": 8500000,
  "confidenceInterval": { "low": 8200000, "high": 8800000 },
  "featureImportances": [
    { "name": "District / Locality", "value": 45.2 },
    { "name": "SqFt Area", "value": 25.1 },
    { "name": "Proximity to City Center", "value": 15.3 },
    { "name": "Interest Rate", "value": 9.4 },
    { "name": "Year Built", "value": 5.0 }
  ],
  "reasoning": "A short 2-sentence explanation in English of why the price is estimated at this level based on regional characteristics."
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      let responseText = (response.text || "{}").trim();
      // Strip markdown code block backticks if present
      responseText = responseText.replace(/^```(json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const predictionData = JSON.parse(responseText);

      res.json(predictionData);
    } catch (error: any) {
      console.error('Error generating prediction:', error);
      res.status(500).json({ error: error.message || 'Failed to generate prediction.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
