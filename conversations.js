import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "" 
});

// In-memory storage for Vercel serverless functions
let conversations = new Map();
let messages = new Map();

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Get all conversations
      const conversationList = Array.from(conversations.values())
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json(conversationList);
    }

    if (req.method === 'POST') {
      // Create new conversation
      const { title } = req.body;
      const id = generateId();
      const conversation = {
        id,
        title: title || "New Chat",
        createdAt: new Date().toISOString(),
      };
      conversations.set(id, conversation);
      return res.json(conversation);
    }

    if (req.method === 'DELETE') {
      // Delete conversation
      const { id } = req.query;
      if (conversations.has(id)) {
        conversations.delete(id);
        // Delete associated messages
        Array.from(messages.entries())
          .filter(([_, message]) => message.conversationId === id)
          .forEach(([messageId]) => messages.delete(messageId));
        return res.json({ message: "Conversation deleted successfully" });
      }
      return res.status(404).json({ message: "Conversation not found" });
    }

    res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
}