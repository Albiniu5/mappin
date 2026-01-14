
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
    const models = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-flash-latest"];

    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });

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
            console.warn(`AI Extraction Failed with ${modelName}:`, error);
            // Continue to next model
        }
    }

    console.error("All AI models failed to extract data.");
    return null;
}
