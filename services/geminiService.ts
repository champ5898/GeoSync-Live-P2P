
import { GoogleGenAI, Type } from "@google/genai";
import { UserLocation } from "../types";

export const getGeminiInsights = async (locations: UserLocation[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const locationSummary = locations
    .map(u => `${u.name} is at (${u.lat.toFixed(4)}, ${u.lng.toFixed(4)})`)
    .join('. ');

  const prompt = `
    I have a group of friends sharing their live locations. 
    Here are their current positions: ${locationSummary}.
    
    Act as a friendly group concierge. Based on these coordinates:
    1. Briefly summarize where the group is (e.g., "everyone is gathered in downtown" or "the group is spread out across the city").
    2. Suggest a few general types of activities they might enjoy nearby (e.g., parks, cafes, or landmarks) based on their distribution.
    3. Keep it concise, professional, and encouraging.
    
    Use Markdown for formatting.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Unable to generate insights at this moment.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The AI assistant is resting right now.";
  }
};
