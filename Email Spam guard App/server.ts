/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper for lazy loading and safe handling of the Gemini API Client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY environment variable is not configured. Please add your key in the Secrets panel in Settings.');
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API Routes

/**
 * Endpoint to analyze an email's phishing techniques using Gemini
 */
app.post('/api/analyze-phishing', async (req, res) => {
  try {
    const { subject, body } = req.body;
    if (!body) {
       res.status(400).json({ error: 'Email body is required for analysis.' });
       return;
    }

    const ai = getGeminiClient();

    const prompt = `
Please perform a detailed cybersecurity and psychological analysis of the following email. 
Analyze if it exhibits any signs of phishing, social engineering, spoofing, or if it looks like standard bulk spam or a legitimate safe communication.

---
SUBJECT: ${subject || '(No Subject)'}
BODY:
${body}
---

Your response must be returned as a clean Markdown analysis. Provide:
1. **Veritable Risk Assessment**: A high-level risk rating (None, Low, Medium, High).
2. **Key Red Flags & Social Engineering Indicators**: Specific sentences, urgency cues, spoofed claims, suspicious link placements, or emotional triggers (like fear, urgency, curiosity, or greed).
3. **Sender & Technical Analysis**: Focus on typical elements (lookalike domain signatures, vague addresses, generic signatures, spoofed branding).
4. **Defensive Guidance**: Concrete steps a user should take to verify this email safely.

Keep the analysis professional, clear, educational, and direct. Avoid repeating the same point.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an elite cyber forensics analyst and social engineering expert specializing in email fraud and phishing detection. Your job is to educate users on deceptive techniques.',
        temperature: 0.2,
      }
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error('Phishing analysis failed:', error);
    res.status(500).json({ 
      error: error.message || 'An error occurred while analyzing the email. Please verify that your Gemini API Key is configured correctly.' 
    });
  }
});

/**
 * Endpoint to generate a custom synthetic email (phishing, spam, or ham) for testing the Naive Bayes engine
 */
app.post('/api/generate-phishing', async (req, res) => {
  try {
    const { templateType, customPrompt } = req.body;
    
    const ai = getGeminiClient();

    let scenarioPrompt = '';
    if (templateType === 'INVOICE_PHISHING') {
      scenarioPrompt = 'A sophisticated billing/invoice phishing email claiming to be from QuickBooks, QuickBooks Payments, or Stripe billing, demanding urgent review of an unpaid $4,850 invoice. Include an unofficial link.';
    } else if (templateType === 'CREDENTIAL_HARVESTING') {
      scenarioPrompt = 'A Microsoft Account Security or Office 365 password expiration alert telling the user that their password will expire in 12 hours. It must prompt them to log in to a fake "micros0ft" link.';
    } else if (templateType === 'DELIVERY_SCAM') {
      scenarioPrompt = 'A shipping delivery failure scam pretending to be FedEx, USPS, or DHL Express, requesting a small fee ($1.99) to re-route a package on hold. Include a lookalike tracking link.';
    } else if (templateType === 'BANK_FRAUD_ALERT') {
      scenarioPrompt = 'An urgent security alert claiming to be from Chase or Bank of America notifying the user of a fraudulent wire transfer of $2,500. It must instruct them to immediately click a verification page to reverse the charge.';
    } else if (templateType === 'SWEEPSTAKES_SPAM') {
      scenarioPrompt = 'A classic sweepstakes or lottery spam email shouting about winning a $500,000 lottery cash prize or Walmart voucher. It uses overly enthusiastic language, lots of caps, and requests contact details.';
    } else if (templateType === 'LEGITIMATE_WORK') {
      scenarioPrompt = 'A normal, legitimate business/workplace email, such as a project updates review, client meeting rescheduling, or general internal memo. It is professional, has no links, and has a normal collaborative tone.';
    } else if (templateType === 'LEGITIMATE_PERSONAL') {
      scenarioPrompt = 'A friendly, normal personal email from a family member (like a parent, sibling, or friend) proposing weekend plans, sharing recipe details, or chatting about a family event.';
    } else {
      scenarioPrompt = customPrompt || 'A realistic email message.';
    }

    const prompt = `
Generate a realistic email template matching the following scenario: "${scenarioPrompt}".
The email should have a sender email, a subject line, and a full body.

Return your response strictly in JSON format matching this schema:
{
  "sender": "The realistic fake sender email address (e.g., support@micos0ft-portal.net or team@github.com)",
  "subject": "The realistic email subject line",
  "body": "The complete, realistic body of the email (including any paragraphs, signatures, and link examples like http://verify-account.net)"
}

Do not include any Markdown headers, wrapper code, or leading/trailing comments. Return ONLY the JSON object.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      }
    });

    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (error: any) {
    console.error('Email generation failed:', error);
    res.status(500).json({ 
      error: error.message || 'An error occurred while generating the email template.' 
    });
  }
});

// Serve frontend assets
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware integrated successfully.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static files mounted.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running on http://0.0.0.0:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error('Failed to start server:', err);
});
