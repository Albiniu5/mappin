
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface ExtractedData {
    latitude: number;
    longitude: number;
    location_name: string;
    category: 'Armed Conflict' | 'Protest' | 'Political Unrest' | 'Other';
    severity: number;
    summary: string;
}

export async function extractConflictData(title: string, description: string): Promise<ExtractedData | null> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
      Analyze the following news snippet about a potential conflict or event:
      Title: "${title}"
      Description: "${description}"

      Extract the following information in strict JSON format:
      1. latitude: Best estimated latitude of the event location (number).
      2. longitude: Best estimated longitude of the event location (number).
      3. location_name: Name of the city/region (string).
      4. category: One of ['Armed Conflict', 'Protest', 'Political Unrest', 'Other'].
      5. severity: A rating from 1 (minor) to 5 (extreme war/catastrophe).
      6. summary: A concise 1-sentence summary of what happened.

      output only the JSON object.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Cleanup markdown code blocks if present
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanText) as ExtractedData;
    } catch (error) {
        console.error("AI Extraction Failed:", error);
        return null;
    }
}
