"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import QrCard from "@/components/QrCard";
import LoadingState from "@/components/LoadingState";

async function resizeImage(file, maxWidth = 800) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
}

const emptyForm = { id: null, name: "", description: "", price: "", category_id: "", image_url: "" };

export default function MenuEditor({ cafeId }) {
  const [cafe, setCafe] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [availabilityUpdatingId, setAvailabilityUpdatingId] = useState(null);
  const [message, setMessage] = useState("");

  async function load() {
    const { data: c } = await supabase.from("cafes").select("*").eq("id", cafeId).single();
    const { data: cats } = await supabase
      .from("categories").select("*").eq("cafe_id", cafeId).order("sort_order").order("name");
    const { data: its } = await supabase
      .from("items").select("*").eq("cafe_id", cafeId).order("name");
    setCafe(c);
    setCategories(cats || []);
    setItems(its || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cafeId]);

  function showError(error) {
    setMessage("Error: " + error.message);
  }

  async function addCategory(e) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    const { error } = await supabase.from("categories").insert({
      cafe_id: cafeId,
      name: newCategory.trim(),
      sort_order: categories.length,
    });
    if (error) return showError(error);
    setNewCategory("");
    load();
  }

  async function deleteCategory(id) {
    if (!confirm("Delete this category? Its items will stay, but without a category.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return showError(error);
    load();
  }

  async function uploadImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    setMessage("");
    const blob = await resizeImage(file);
    const path = `${cafeId}/${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from("menu-images")
      .upload(path, blob, { contentType: "image/jpeg" });
    if (error) {
      setBusy(false);
      return setMessage("Upload error: " + error.message);
    }
    const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: data.publicUrl }));
    setBusy(false);
  }

  async function saveItem(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const payload = {
      cafe_id: cafeId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price),
      category_id: form.category_id || null,
      image_url: form.image_url || null,
    };
    const { error } = form.id
      ? await supabase.from("items").update(payload).eq("id", form.id)
      : await supabase.from("items").insert(payload);
    setBusy(false);
    if (error) return showError(error);
    setForm(emptyForm);
    setMessage("Saved!");
    load();
  }

  async function toggleAvailable(item) {
    if (availabilityUpdatingId) return;

    const nextAvailability = !item.is_available;
    setAvailabilityUpdatingId(item.id);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("items")
        .update({ is_available: nextAvailability })
        .eq("id", item.id)
        .eq("cafe_id", cafeId)
        .select("id, is_available")
        .maybeSingle();

      if (error || !data) {
        setMessage("Unable to update this item's stock status. Please try again.");
        return;
      }

      setItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === item.id
            ? { ...currentItem, is_available: data.is_available }
            : currentItem
        )
      );
      setMessage(`${item.name} marked ${nextAvailability ? "available" : "out of stock"}.`);
    } catch {
      setMessage("Unable to update this item's stock status. Please try again.");
    } finally {
      setAvailabilityUpdatingId(null);
    }
  }

  async function deleteItem(id) {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) return showError(error);
    load();
  }

  if (!cafe) {
    return (
      <div className="space-y-6">
        <LoadingState label="Loading cafe menu..." />
      </div>
    );
  }

  const categoryName = (id) => categories.find((c) => c.id === id)?.name || "No category";

  return (
    <div className="space-y-6">
      <div className="panel p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="label">Cafe profile</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.08em] text-[#111111]">{cafe.name}</h1>
          </div>
          <a href={`/${cafe.slug}`} target="_blank" className="secondary-button">
            View public menu
          </a>
        </div>
      </div>

      {message && (
        <div role="status" aria-live="polite" className="panel border-l-[3px] border-[#a2672c] bg-[#fffaf1] px-4 py-3 text-sm text-[#5c412c]">
          {message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_1.35fr]">
        <section className="panel p-5">
          <h2 className="text-xl font-semibold tracking-[-0.04em]">Categories</h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-[#f5f5f2] px-3 py-1.5 text-sm text-[#111111]">
                {c.name}
                <button type="button" onClick={() => deleteCategory(c.id)} className="text-[#b63a3a]">×</button>
              </span>
            ))}
            {categories.length === 0 && <p className="text-sm text-[#5f5a56]">No categories yet.</p>}
          </div>

          <form onSubmit={addCategory} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="e.g. Coffee, Snacks, Desserts"
              className="field flex-1"
            />
            <button className="primary-button">Add</button>
          </form>
        </section>

        <section className="panel p-5">
          <h2 className="text-xl font-semibold tracking-[-0.04em]">{form.id ? "Edit item" : "Add item"}</h2>
          <form onSubmit={saveItem} className="mt-5 space-y-4">
            <div>
              <label className="label block pb-2">Item name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Item name"
                className="field"
              />
            </div>

            <div>
              <label className="label block pb-2">Price</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="Price"
                className="field"
              />
            </div>

            <div>
              <label className="label block pb-2">Category</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="field"
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label block pb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Short description (optional)"
                className="field min-h-[100px] resize-y"
              />
            </div>

            <div>
              <label className="label block pb-2">Image</label>
              <input type="file" accept="image/*" onChange={uploadImage} className="block w-full text-sm text-[#5f5a56] file:mr-3 file:rounded-[10px] file:border-0 file:bg-[#111111] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white" />
              {form.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.image_url} alt="" className="mt-3 h-20 w-20 rounded-[12px] object-cover" />
              )}
            </div>

            <div className="flex gap-3">
              <button disabled={busy} className="primary-button">
                {busy ? "Please wait..." : "Save item"}
              </button>
              {form.id && (
                <button type="button" onClick={() => setForm(emptyForm)} className="secondary-button">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>
      </div>

      <section className="panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-[-0.04em]">Menu items</h2>
          <span className="rounded-full bg-[#f5f5f2] px-2.5 py-1 text-xs font-medium text-[#111111]">{items.length} total</span>
        </div>

        {items.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-black/10 bg-[#f5f5f2] p-8 text-center">
            <h3 className="text-lg font-semibold tracking-[-0.04em] text-[#111111]">No menu items yet</h3>
            <p className="mt-2 text-sm text-[#5f5a56]">Add your first item above to start building the menu.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-[16px] border border-black/5 bg-[#f5f5f2] p-3 sm:flex-row sm:items-center">
                {item.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt="" className="h-16 w-16 rounded-[12px] object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-base font-medium text-[#111111]">{item.name}</p>
                    <span className="text-sm font-semibold text-[#111111]">₹{Number(item.price)}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#5f5a56]">{categoryName(item.category_id)}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span
                    className={`rounded-full px-2.5 py-1.5 text-xs font-semibold ${
                      item.is_available
                        ? "bg-[#eaf7f1] text-[#1f7a58]"
                        : "bg-[#f8e7e7] text-[#b63a3a]"
                    }`}
                  >
                    {item.is_available ? "In stock" : "Out of stock"}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleAvailable(item)}
                    role="switch"
                    aria-checked={Boolean(item.is_available)}
                    aria-label={`Mark ${item.name} ${item.is_available ? "out of stock" : "in stock"}`}
                    disabled={availabilityUpdatingId !== null}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a2672c] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${
                      item.is_available ? "bg-[#1f7a58]" : "bg-[#b63a3a]"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        item.is_available ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  {availabilityUpdatingId === item.id && (
                    <span className="text-xs text-[#5f5a56]" role="status">Saving…</span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        id: item.id,
                        name: item.name,
                        description: item.description || "",
                        price: String(item.price),
                        category_id: item.category_id || "",
                        image_url: item.image_url || "",
                      })
                    }
                    className="text-sm font-medium text-[#111111] underline underline-offset-4"
                  >
                    Edit
                  </button>
                  <button type="button" onClick={() => deleteItem(item.id)} className="text-sm font-medium text-[#b63a3a] underline underline-offset-4">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <QrCard cafe={cafe} />
    </div>
  );
}
