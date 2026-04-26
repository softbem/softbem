
import { GoogleGenAI } from "@google/genai";
import { CartItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getSmartRecipeSuggestions = async (cartItems: CartItem[]): Promise<string> => {
  if (cartItems.length === 0) return "Adicione itens ao carrinho para receber sugestões de receitas!";

  const itemsList = cartItems.map(item => `${item.quantity}${item.unit} de ${item.name}`).join(', ');
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Com base nos itens do meu carrinho: ${itemsList}, sugira uma receita rápida e saudável em português. Liste os ingredientes extras que eu possa precisar.`,
      config: {
        systemInstruction: "Você é um chef especialista em alimentação saudável e hortifruti. Dê respostas concisas, criativas e amigáveis.",
      }
    });
    return response.text || "Não foi possível gerar uma sugestão no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "O assistente de receitas está descansando. Tente novamente mais tarde!";
  }
};

export const generateProductDescription = async (productName: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Crie uma descrição curta e atraente para o produto de hortifruti: ${productName}. Foco em frescor, saúde e sabor.`,
    });
    return response.text || "Descrição fresca em breve!";
  } catch (error) {
    return "Produto de alta qualidade e frescor garantido.";
  }
};
