import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const translateText = async (text: string, targetLanguage: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Traduza o seguinte texto para ${targetLanguage}. Retorne apenas a tradução, sem explicações extras: "${text}"`,
    });

    return response.text?.trim() || text;
  } catch (error) {
    console.error("Error translating text:", error);
    return text;
  }
};

export const chatWithGemini = async (prompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text?.trim() || "Desculpe, não consegui gerar uma resposta.";
  } catch (error) {
    console.error("Error chatting with Gemini:", error);
    return "Erro ao processar sua solicitação.";
  }
};
