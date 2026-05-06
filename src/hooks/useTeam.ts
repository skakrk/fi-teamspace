import { useEffect, useState } from 'react';
import { supabase, type DbProfile } from '@/lib/supabase';

export function useTeam() {
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      if (alive) {
        setProfiles((data as DbProfile[]) || []);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { profiles, loading, setProfiles };
}

export function useProfile(userId: string | null | undefined) {
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (alive) {
        setProfile((data as DbProfile) || null);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  return { profile, loading, setProfile };
}
