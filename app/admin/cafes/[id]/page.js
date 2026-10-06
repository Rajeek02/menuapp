"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/userProfile";
import MenuEditor from "@/components/MenuEditor";
import LoadingState from "@/components/LoadingState";

export default function AdminCafePage() {
  const { id } = useParams();
  const { loading } = useProfile("super_admin");
  const [name, setName] = useState("");
  const [color, setColor] = useState("#5a2d0c");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (loading) return;
    supabase.from("cafes").select("name, brand_color").eq("id", id).single().then(({ data }) => {
      if (data) {
        setName(data.name);
        setColor(data.brand_color || "#5a2d0c");
      }
    });
  }, [loading, id]);

  async function saveDetails(e) {
    e.preventDefault();
    const { error } = await supabase
      .from("cafes").update({ name: name.trim(), brand_color: color }).eq("id", id);
    setMessage(error ? "Error: " + error.message : "Details saved. Refresh to see the new name.");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fafaf8] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <LoadingState label="Loading cafe details..." />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fafaf8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="panel mb-6 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="label">RASA</p>
              <Link href="/admin" className="mt-2 inline-block text-sm font-medium text-[#111111] underline underline-offset-4">
                &larr; All cafes
              </Link>
            </div>
          </div>
        </header>

        <form onSubmit={saveDetails} className="panel mb-6 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <label className="label block pb-2">Cafe name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="field" />
            </div>
            <div>
              <label className="label block pb-2">Brand accent</label>
              <div className="flex items-center gap-3 rounded-[12px] border border-black/8 bg-white p-2">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-12 rounded border-0 bg-transparent p-0" />
                <span className="text-sm font-medium text-[#111111]">{color}</span>
              </div>
            </div>
            <button className="primary-button md:self-end">Save details</button>
          </div>
          {message && <p className="mt-4 text-sm text-[#5f5a56]">{message}</p>}
        </form>

        <MenuEditor cafeId={id} />
      </div>
    </main>
  );
}
