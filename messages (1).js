import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "" 
});

// In-memory storage (shared across functions)
let conversations = new Map();
let messages = new Map();

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id: conversationId } = req.query;

  try {
    if (req.method === 'POST') {
      // Send message and get AI response
      const { content } = req.body;

      if (!content?.trim()) {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Validate conversation exists
      if (!conversations.has(conversationId)) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Save user message
      const userMessageId = generateId();
      const userMessage = {
        id: userMessageId,
        conversationId,
        role: "user",
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };
      messages.set(userMessageId, userMessage);

      // Get conversation history for context
      const conversationMessages = Array.from(messages.values())
        .filter(msg => msg.conversationId === conversationId)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      const conversationHistory = conversationMessages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));

      try {
        // Call Gemini API
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: conversationHistory,
        });

        const aiResponse = response.text || "I'm sorry, I couldn't generate a response.";

        // Save AI response
        const assistantMessageId = generateId();
        const assistantMessage = {
          id: assistantMessageId,
          conversationId,
          role: "assistant", 
          content: aiResponse,
          createdAt: new Date().toISOString(),
        };
        messages.set(assistantMessageId, assistantMessage);

        return res.json({
          userMessage,
          assistantMessage,
        });

      } catch (aiError) {
        console.error("Gemini API error:", aiError);
        
        // Save error message
        const errorMessageId = generateId();
        const errorMessage = {
          id: errorMessageId,
          conversationId,
          role: "assistant",
          content: "I'm sorry, I'm having trouble connecting to my AI service right now. Please try again later.",
          createdAt: new Date().toISOString(),
        };
        messages.set(errorMessageId, errorMessage);

        return res.status(500).json({
          message: "Failed to get AI response",
          userMessage,
          assistantMessage: errorMessage,
        });
      }
    }

    res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error('Message handling error:', error);
    res.status(500).json({ message: "Failed to process message" });
  }
}