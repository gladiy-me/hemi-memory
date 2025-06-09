// pages/api/leaderboard/memory.js
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('leaderboard_memory')
      .select('id, wallet_address, username, score, created_at')
      .order('score', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Supabase GET (memory) error:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { wallet_address, username, score } = req.body;
    if (!wallet_address || !username || typeof score !== 'number') {
      return res
        .status(400)
        .json({ error: 'Требуются wallet_address, username, score (number)' });
    }

    const { data, error } = await supabase
      .from('leaderboard_memory')
      .insert([{ wallet_address, username, score }])
      .select()
      .single();

    if (error) {
      console.error('Supabase INSERT (memory) error:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json(data);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
