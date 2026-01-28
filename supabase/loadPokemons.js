import { supabase } from '../supabase/supabase.js';

export async function loadPokemonsFromSupabase() {
  const { data, error } = await supabase.from('pokemons').select('*');

  if (error) {
    console.error('loading error from supbase: ', error);
  }

  return data;
}
