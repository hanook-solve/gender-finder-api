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
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
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

  const prompt = `You are a hilarious AI that determines someone's personality energy breakdown based on quiz answers.

${answersText}

Pick 4 to 6 energy types from this list that best match the person:
🗿 Sigma, 🌾 Aura Farmer, 👑 Roman Emperor, 🤖 NPC, 💅 Girl Boss, 🌀 Chaotic Neutral, 🐺 Alpha, 🎭 Main Character, 🧘 Zen Master, 🔥 Menace to Society, 💤 Background Character, 🏛️ Philosopher King, 🦁 Lone Wolf, 🧠 Galaxy Brain, 🎪 Court Jester, 💀 Sigma Grindset

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "emoji": "<single emoji that best represents them overall>",
  "title": "<funny meme-style overall title like 'Certified Aura Farmer' or 'Sigma NPC Hybrid'>",
  "description": "<2 sentences, funny, references something specific from their answers>",
  "roast": "<one spicy AI roast sentence about them>",
  "energies": [
    { "emoji": "<emoji>", "label": "<energy name>", "pct": <number> },
    { "emoji": "<emoji>", "label": "<energy name>", "pct": <number> },
    { "emoji": "<emoji>", "label": "<energy name>", "pct": <number> },
    { "emoji": "<emoji>", "label": "<energy name>", "pct": <number> }
  ]
}

Rules:
- energies must have 4 to 6 items
- all pct values must add up to exactly 100
- make percentages unexpected and funny like 5%, 67%, 13%
- pick energies that actually match their answers
- keep it playful, never mean`;

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
      roast: "You broke the algorithm. That's your superpower.",
      energies: [
        { emoji: "🗿", label: "Sigma", pct: 25 },
        { emoji: "🤖", label: "NPC", pct: 25 },
        { emoji: "🌀", label: "Chaotic Neutral", pct: 25 },
        { emoji: "💤", label: "Background Character", pct: 25 },
      ]
    });
  }
});

app.listen(PORT, () => {
  console.log(`Gender Finder API running on port ${PORT} 🚀`);
});