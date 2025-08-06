// In-memory storage (shared with conversations.js)
let conversations = new Map();
let messages = new Map();

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      // Get conversation with messages
      const conversation = conversations.get(id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const conversationMessages = Array.from(messages.values())
        .filter(msg => msg.conversationId === id)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      return res.json({
        ...conversation,
        messages: conversationMessages,
      });
    }

    res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
}