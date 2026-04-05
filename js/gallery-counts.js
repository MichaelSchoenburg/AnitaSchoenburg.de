// js/gallery-counts.js
import { supabase } from './supabase-config.js';

export async function loadCommentCounts(paintingIds) {
  const { data } = await supabase
    .from('paintings')
    .select('id, comment_count')
    .in('id', paintingIds);

  const counts = {};
  for (const row of data ?? []) counts[row.id] = row.comment_count;
  return counts;
}
