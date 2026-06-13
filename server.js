require('dotenv').config();
const express = require("express");
const https = require("https");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors()); // allows your Vercel frontend to call this
app.use(express.json());

// ── HEALTH CHECK ─────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "Gender Finder API is alive 🧬" });
});

// ── MAIN ROUTE ───────────────────────────────────────────────────────
app.post("/result", async (req, res) => {
  const { answers } = req.body;

  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: "Invalid answers" });
  }

  const answersText = answers
    .map((a, i) => `Q${i + 1}: ${a.q}\nAnswer: ${a.a}`)
    .join("\n\n");

  const prompt = `You are a hilarious AI that determines someone's gender energy based on personality quiz answers.

${answersText}

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "emoji": "<single emoji>",
  "title": "<meme-style title like '100% Sigma Male' or '78% Roman Emperor Energy' or 'Certified NPC'>",
  "description": "<2 sentences, funny, references something specific from their answers>",
  "male_pct": <0-100>,
  "female_pct": <0-100, must sum to 100 with male_pct>,
  "roast": "<one spicy AI roast sentence about them>"
}

Rules: use internet meme culture. Make percentages unexpected and funny. Keep it playful, never mean.`;

  const payload = JSON.stringify({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 1.1,
    max_tokens: 350,
  });

  try {
    const data = await new Promise((resolve, reject) => {
      const options = {
        hostname: "api.groq.com",
        path: "/openai/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Length": Buffer.byteLength(payload),
        },
      };

      const request = https.request(options, (response) => {
        let body = "";
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () => {
          try { resolve(JSON.parse(body)); }
          catch (e) { reject(e); }
        });
      });

      request.on("error", reject);
      request.write(payload);
      request.end();
    });

    console.log("Groq response:", JSON.stringify(data));
    const raw = data.choices[0].message.content
      .replace(/```json|```/g, "")
      .trim();
    const result = JSON.parse(raw);
    return res.status(200).json(result);

  } catch (err) {
    console.error("Groq error:", err);
    return res.status(500).json({
      emoji: "🤔",
      title: "Unclassifiable Entity",
      description: "Our AI had an existential crisis trying to figure you out. That's honestly impressive.",
      male_pct: 50,
      female_pct: 50,
      roast: "You broke the algorithm. That's your superpower.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Gender Finder API running on port ${PORT} 🚀`);
});