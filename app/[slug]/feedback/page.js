import { notFound } from "next/navigation";
import CustomerFeedbackForm from "@/components/CustomerFeedbackForm";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { data: cafe } = await supabase
    .from("cafes")
    .select("name, is_active")
    .eq("slug", slug)
    .maybeSingle();

  return {
    title: cafe?.is_active ? `Feedback for ${cafe.name} | RASA` : "Cafe Feedback | RASA",
    robots: { index: false, follow: false },
  };
}

export default async function CafeFeedbackPage({ params }) {
  const { slug } = await params;
  const { data: cafe, error } = await supabase
    .from("cafes")
    .select("id, name, slug, logo_url, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !cafe || !cafe.is_active) notFound();

  return <CustomerFeedbackForm cafe={cafe} />;
}
