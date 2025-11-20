const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { activity, profile } = req.body;
    if (!activity || !profile) return res.status(400).json({ error: "Missing data" });

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) return res.status(500).json({ error: "API key not configured" });

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `[USE YOUR EXACT PROMPT FROM BEFORE]`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    res.json({ success: true, data: response.text() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
