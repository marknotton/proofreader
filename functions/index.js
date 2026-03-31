import { onRequest } from "firebase-functions/v2/https"
import { initializeApp } from "firebase-admin/app"
import { getFirestore, FieldValue } from "firebase-admin/firestore"
import { defineSecret } from "firebase-functions/params"

initializeApp()
const db = getFirestore()

const DEMO_LIMIT = 5
const GEMINI_MODEL = "gemini-2.5-flash"
const geminiKey = defineSecret("GEMINI_API_KEY")

/**
 * Demo proofreading proxy.
 * Accepts a POST with { installId, systemPrompt, text } and forwards it
 * to Gemini using a server-held API key. Each installId is capped at
 * DEMO_LIMIT requests tracked in Firestore.
 */
export const demo = onRequest(
  { cors: true, secrets: [geminiKey] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" })
      return
    }

    const { installId, systemPrompt, text } = req.body || {}

    if (!installId || !text) {
      res.status(400).json({ error: "Missing installId or text" })
      return
    }

    // ── Check / increment usage ──
    const docRef = db.collection("demo_usage").doc(installId)
    const doc = await docRef.get()
    const used = doc.exists ? doc.data().count || 0 : 0

    if (used >= DEMO_LIMIT) {
      res.status(429).json({
        error: "Demo limit reached",
        message: "You've used all 5 demo prompts. Add your own API key to continue using Proofreader.",
        used,
        limit: DEMO_LIMIT,
      })
      return
    }

    // Increment usage (create doc if first request)
    await docRef.set(
      {
        count: FieldValue.increment(1),
        lastUsed: FieldValue.serverTimestamp(),
        ip: req.ip || null,
      },
      { merge: true }
    )

    // ── Forward to Gemini ──
    const prompt = systemPrompt || "Fix grammar and spelling only. Preserve the original tone and style."

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey.value()}`

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: prompt }] },
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        res.status(502).json({ error: `Gemini API error (${response.status})`, detail: err })
        return
      }

      const data = await response.json()
      const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || ""

      res.json({
        result,
        used: used + 1,
        limit: DEMO_LIMIT,
      })
    } catch (err) {
      res.status(500).json({ error: "Failed to reach Gemini API", detail: err.message })
    }
  }
)
