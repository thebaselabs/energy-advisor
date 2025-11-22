const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { activity, profile } = req.body;
    if (!activity || !profile) return res.status(400).json({ error: "Missing activity or profile data" });

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) return res.status(500).json({ error: "API key not configured" });

    // ✅ USE DIRECT REST API - NOT THE SDK
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `
CRITICAL: Use EXACT calculations based on user profile. DO NOT estimate generally.

USER PROFILE (MUST USE THESE EXACT NUMBERS):
- Weight: ${profile.weight} kg - DIRECTLY AFFECTS CALORIE BURN
- Age: ${profile.age} years - AFFECTS METABOLISM  
- Gender: ${profile.gender} - AFFECTS CALORIE CALCULATIONS
- Fitness Level: ${profile.fitnessLevel} - AFFECTS INTENSITY & RECOVERY

ACTIVITY: "${activity}"

CALORIE CALCULATION RULES:
- Base metabolic rate adjustment for age/gender
- Weight-based calorie burn: heavier people burn more
- Fitness level intensity adjustment
- MAXIMUM calories per hour: 1000 for extreme exercise

CALORIE RANGE SANITY CHECK:
- Light activity: 150-300 calories/hour
- Moderate: 300-500 calories/hour  
- Intense: 500-800 calories/hour
- Extreme: 800-1000 calories/hour

CRITICAL: You MUST return foods in EXACT 4 categories:

1. ⚡ QUICK ENERGY: Fast-digesting carbs, immediate consumption (1-hour)
2. 💪 PROTEIN RICH: High-protein foods, muscle repair focus (1-2 hours)  
3. ⚖️ BALANCED: Good carb-protein-fat ratio, within 2 hours
4. 🍽️ FULL MEALS: Complete meals, next proper meal (2+ hours)

FOOD FORMAT PER CATEGORY:
- 3-5 foods per category
- Each food: name, calories, timing, rationale, emoji
- NO MISSING CATEGORIES

EXACT JSON RESPONSE REQUIRED:
{
    "calories": calculated_number_using_above_rules,
    "activityType": "light|moderate|intense|extreme",
    "analysis": "Detailed analysis using user profile data",
    "macronutrients": {"carbs": 50-70, "protein": 15-30, "fat": 15-25},
    "food_categories": {
        "quick_energy": [
            {
                "name": "Banana",
                "calories": 105,
                "timing": "immediate",
                "rationale": "Fast-digesting carbs replenish muscle glycogen quickly",
                "emoji": "🍌"
            }
        ],
        "protein_rich": [
            {
                "name": "Greek Yogurt with Berries",
                "calories": 150,
                "timing": "1-hour",
                "rationale": "High-quality protein for muscle repair with antioxidants",
                "emoji": "🥛🫐"
            }
        ],
        "balanced": [
            {
                "name": "Turkey Sandwich",
                "calories": 320,
                "timing": "2-hours",
                "rationale": "Balanced macros for sustained energy and recovery",
                "emoji": "🥪"
            }
        ],
        "full_meals": [
            {
                "name": "Salmon with Sweet Potato & Vegetables",
                "calories": 450,
                "timing": "next-meal",
                "rationale": "Complete meal with omega-3s and complex carbs for full recovery",
                "emoji": "🐟🍠"
            }
        ]
    }
}

Be realistic and practical in your recommendations.
`;

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2000,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0].content.parts[0].text) {
      throw new Error('Invalid response from Gemini API');
    }
    
    const responseText = data.candidates[0].content.parts[0].text;
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const aiResponse = JSON.parse(jsonMatch[0]);
      res.status(200).json(aiResponse);
    } else {
      throw new Error('No JSON found in AI response');
    }

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: error.message });
  }
};
