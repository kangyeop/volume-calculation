import { cache } from 'react';
import { createSupabaseServer } from '@/lib/supabase/server';

export const getUserId = cache(async (): Promise<string> => {
  const supabase = await createSupabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return user.id;
});
