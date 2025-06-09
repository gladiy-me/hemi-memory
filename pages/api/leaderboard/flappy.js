// pages/api/leaderboard/flappy.js
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export default async function handler(req, res) {
  console.log("→ Incoming", req.method, "to /api/leaderboard/flappy");
  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("leaderboard_flappy")
      .select("id, wallet_address, username, score, created_at")
      .order("score", { ascending: false })
      .limit(10);

    if (error) {
      console.error("[API GET] error:", error);
      return res.status(500).json({ error: error.message });
    }
    console.log("[API GET] returning", data.length, "records");
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    console.log("[API POST] body:", req.body);
    const { wallet_address, username, score } = req.body;

    if (
      typeof wallet_address !== "string" ||
      typeof username !== "string" ||
      typeof score !== "number"
    ) {
      console.warn("[API POST] validation failed:", req.body);
      return res.status(400).json({
        error:
          "Неверные данные: ожидаются { wallet_address: string, username: string, score: number }",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("leaderboard_flappy")
      .insert({ wallet_address, username, score })
      .select()
      .single();

    if (error) {
      console.error("[API POST] supabase.insert error:", error);
      return res.status(500).json({ error: error.message });
    }
    console.log("[API POST] inserted:", data);
    return res.status(201).json(data);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
