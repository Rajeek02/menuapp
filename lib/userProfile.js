"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Checks who is logged in. If nobody (or wrong role), sends them to /login.
export function useProfile(requiredRole) {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (!data || (requiredRole && data.role !== requiredRole)) {
        router.replace("/login");
        return;
      }
      setProfile(data);
      setLoading(false);
    }
    check();
  }, [router, requiredRole]);

  return { profile, loading };
}

export async function logout(router) {
  await supabase.auth.signOut();
  router.replace("/login");
}
