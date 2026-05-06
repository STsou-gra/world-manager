// src/hooks/useCharacters.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Character } from '../types/database';

export function useCharacters() {
  const [characters, setCharacters] = useState<Character[]>([]);

  const fetchCharacters = useCallback(async () => {
    // 中間テーブルを経由してタグ情報も取得するクエリ
    const { data, error } = await supabase
      .from('characters')
      .select(`
        *,
        worlds:character_worlds(worlds(*)),
        organizations:character_organizations(organizations(*))
      `);
    
    if (data) {
      // Supabaseのネストされた構造を扱いやすい形に整形
      const formatted = data.map((c: any) => ({
        ...c,
        worlds: c.worlds.map((w: any) => w.worlds),
        organizations: c.organizations.map((o: any) => o.organizations)
      }));
      setCharacters(formatted);
    }
  }, []);

  useEffect(() => { fetchCharacters(); }, [fetchCharacters]);

  return { characters, refetch: fetchCharacters };
}