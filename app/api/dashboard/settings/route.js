import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAFE_FIELDS =
  "id, name, slug, logo_url, address, location_url, phone, whatsapp, instagram_url, tagline, description, opening_hours";
const LOGO_BUCKET = "cafe-logos";
const MAX_LOGO_SIZE = 5 * 1024 * 1024;
const LOGO_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const TEXT_LIMITS = {
  address: 500,
  location_url: 2048,
  phone: 32,
  whatsapp: 32,
  instagram_url: 2048,
  tagline: 160,
  description: 2000,
  opening_hours: 160,
};

function jsonError(message, status) {
  return NextResponse.json({ error: message }, { status });
}

function isSettingsMigrationMissing(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  return (
    code === "42703" ||
    code === "PGRST204" ||
    (message.includes("column") &&
      (message.includes("does not exist") || message.includes("schema cache")))
  );
}

function cafeQueryError(error, action) {
  if (isSettingsMigrationMissing(error)) {
    return jsonError(
      "Cafe settings are not set up yet. Apply the cafe settings database migration, then try again.",
      503
    );
  }
  return jsonError(`Unable to ${action} cafe information. Please try again.`, 500);
}

async function getOwnerCafe(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { response: jsonError("Settings are not available right now.", 503) };
  }

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return { response: jsonError("Please sign in to access cafe settings.", 401) };
  }

  try {
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data.user) {
      return { response: jsonError("Your session has expired. Please sign in again.", 401) };
    }

    const supabaseAdmin = createSupabaseAdminClient();
    if (!supabaseAdmin) {
      return { response: jsonError("Settings are not available right now.", 503) };
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, cafe_id")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      return { response: jsonError("Unable to verify your cafe access.", 500) };
    }
    if (profile?.role !== "cafe_owner" || !profile.cafe_id) {
      return { response: jsonError("Only a cafe owner can access these settings.", 403) };
    }

    return { supabaseAdmin, cafeId: profile.cafe_id };
  } catch {
    return { response: jsonError("Unable to verify your cafe access.", 500) };
  }
}

function validateAndNormalize(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Please check the cafe information and try again." };
  }

  if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100) {
    return { error: "Enter a cafe name of 1 to 100 characters." };
  }

  const updates = { name: body.name.trim() };
  for (const [field, maxLength] of Object.entries(TEXT_LIMITS)) {
    const value = body[field] === null || body[field] === undefined ? "" : body[field];
    if (typeof value !== "string") {
      return { error: "Please check the cafe information and try again." };
    }
    const trimmed = value.trim();
    if (trimmed.length > maxLength) {
      return { error: `${field.replaceAll("_", " ")} is too long.` };
    }
    updates[field] = trimmed || null;
  }

  for (const field of ["location_url", "instagram_url"]) {
    const value = updates[field];
    if (!value) continue;
    let url;
    try {
      url = new URL(value);
    } catch {
      return { error: `Enter a valid ${field === "location_url" ? "location" : "Instagram"} URL.` };
    }
    if (!["https:", "http:"].includes(url.protocol)) {
      return { error: `Enter a valid ${field === "location_url" ? "location" : "Instagram"} URL.` };
    }
    if (field === "instagram_url" && !/(^|\.)instagram\.com$/i.test(url.hostname)) {
      return { error: "Enter a valid Instagram URL." };
    }
  }

  for (const field of ["phone", "whatsapp"]) {
    const value = updates[field];
    if (value && !/^\+?[0-9().\-\s]{7,32}$/.test(value)) {
      return { error: `Enter a valid ${field === "phone" ? "phone" : "WhatsApp"} number.` };
    }
  }

  return { updates };
}

export async function GET(request) {
  const context = await getOwnerCafe(request);
  if (context.response) return context.response;

  try {
    const { data, error } = await context.supabaseAdmin
      .from("cafes")
      .select(CAFE_FIELDS)
      .eq("id", context.cafeId)
      .maybeSingle();

    if (error && isSettingsMigrationMissing(error)) {
      const { data: basicCafe, error: basicCafeError } = await context.supabaseAdmin
        .from("cafes")
        .select("id, name, slug, logo_url")
        .eq("id", context.cafeId)
        .maybeSingle();

      if (basicCafeError) return cafeQueryError(basicCafeError, "load");
      if (!basicCafe) return jsonError("Your cafe could not be found.", 404);

      return NextResponse.json({
        cafe: {
          ...basicCafe,
          address: null,
          location_url: null,
          phone: null,
          whatsapp: null,
          instagram_url: null,
          tagline: null,
          description: null,
          opening_hours: null,
        },
        settingsReady: false,
      });
    }
    if (error) return cafeQueryError(error, "load");
    if (!data) return jsonError("Your cafe could not be found.", 404);
    return NextResponse.json({ cafe: data, settingsReady: true });
  } catch {
    return jsonError("Unable to load cafe information. Please try again.", 500);
  }
}

export async function PUT(request) {
  const context = await getOwnerCafe(request);
  if (context.response) return context.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Please check the cafe information and try again.", 400);
  }

  const { updates, error: validationError } = validateAndNormalize(body);
  if (validationError) return jsonError(validationError, 400);

  try {
    const { data, error } = await context.supabaseAdmin
      .from("cafes")
      .update(updates)
      .eq("id", context.cafeId)
      .select(CAFE_FIELDS)
      .maybeSingle();

    if (error) return cafeQueryError(error, "save");
    if (!data) return jsonError("Your cafe could not be found.", 404);
    return NextResponse.json({ cafe: data });
  } catch {
    return jsonError("Unable to save cafe information. Please try again.", 500);
  }
}

function hasValidImageSignature(bytes, contentType) {
  if (contentType === "image/png") {
    return bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;
  }
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/webp") {
    return (
      bytes.length >= 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
}

function getOwnedLogoPath(publicUrl, cafeId) {
  if (!publicUrl || !SUPABASE_URL) return null;

  try {
    const imageUrl = new URL(publicUrl);
    const supabaseUrl = new URL(SUPABASE_URL);
    const prefix = `/storage/v1/object/public/${LOGO_BUCKET}/`;
    if (imageUrl.origin !== supabaseUrl.origin || !imageUrl.pathname.startsWith(prefix)) {
      return null;
    }

    const path = decodeURIComponent(imageUrl.pathname.slice(prefix.length));
    const segments = path.split("/");
    if (
      segments.length < 2 ||
      segments[0] !== cafeId ||
      segments.some((segment) => !segment || segment === "." || segment === "..")
    ) {
      return null;
    }
    return path;
  } catch {
    return null;
  }
}

async function removePreviousLogo(context, previousLogoUrl) {
  const path = getOwnedLogoPath(previousLogoUrl, context.cafeId);
  if (!path) return true;

  try {
    const { error } = await context.supabaseAdmin.storage.from(LOGO_BUCKET).remove([path]);
    return !error;
  } catch {
    return false;
  }
}

export async function POST(request) {
  const context = await getOwnerCafe(request);
  if (context.response) return context.response;

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Choose a PNG, JPG, JPEG, or WEBP image to upload.", 400);
  }

  const file = formData.get("logo");
  if (!file || typeof file.arrayBuffer !== "function") {
    return jsonError("Choose a cafe logo to upload.", 400);
  }
  if (!Object.hasOwn(LOGO_TYPES, file.type)) {
    return jsonError("Logo must be a PNG, JPG, JPEG, or WEBP image.", 400);
  }
  if (file.size <= 0 || file.size > MAX_LOGO_SIZE) {
    return jsonError("Logo image must be no larger than 5 MB.", 400);
  }

  let imageBytes;
  try {
    imageBytes = Buffer.from(await file.arrayBuffer());
  } catch {
    return jsonError("Unable to read the selected image. Please try again.", 400);
  }
  if (!hasValidImageSignature(imageBytes, file.type)) {
    return jsonError("The selected file is not a valid supported image.", 400);
  }

  const { data: existingCafe, error: existingCafeError } = await context.supabaseAdmin
    .from("cafes")
    .select("logo_url")
    .eq("id", context.cafeId)
    .maybeSingle();
  if (existingCafeError) return cafeQueryError(existingCafeError, "load");
  if (!existingCafe) return jsonError("Your cafe could not be found.", 404);

  const filePath = `${context.cafeId}/${randomUUID()}.${LOGO_TYPES[file.type]}`;
  let publicUrl;
  try {
    const { error: uploadError } = await context.supabaseAdmin.storage
      .from(LOGO_BUCKET)
      .upload(filePath, imageBytes, {
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) {
      return jsonError("Unable to upload your logo. Please try again.", 500);
    }

    ({ data: { publicUrl } } = context.supabaseAdmin.storage
      .from(LOGO_BUCKET)
      .getPublicUrl(filePath));
    if (!publicUrl) {
      await context.supabaseAdmin.storage.from(LOGO_BUCKET).remove([filePath]);
      return jsonError("Unable to save your logo. Please try again.", 500);
    }

    const { data, error: updateError } = await context.supabaseAdmin
      .from("cafes")
      .update({ logo_url: publicUrl })
      .eq("id", context.cafeId)
      .select("logo_url")
      .maybeSingle();

    if (updateError || !data) {
      await context.supabaseAdmin.storage.from(LOGO_BUCKET).remove([filePath]);
      return updateError ? cafeQueryError(updateError, "save") : jsonError("Your cafe could not be found.", 404);
    }

    const previousLogoRemoved = await removePreviousLogo(context, existingCafe.logo_url);
    return NextResponse.json({
      logo_url: data.logo_url,
      cleanupWarning: previousLogoRemoved
        ? null
        : "Your new logo is saved, but the previous image could not be removed from storage.",
    });
  } catch {
    await context.supabaseAdmin.storage.from(LOGO_BUCKET).remove([filePath]);
    return jsonError("Unable to save your logo. Please try again.", 500);
  }
}

export async function DELETE(request) {
  const context = await getOwnerCafe(request);
  if (context.response) return context.response;

  try {
    const { data: cafe, error: cafeError } = await context.supabaseAdmin
      .from("cafes")
      .select("logo_url")
      .eq("id", context.cafeId)
      .maybeSingle();

    if (cafeError) return cafeQueryError(cafeError, "load");
    if (!cafe) return jsonError("Your cafe could not be found.", 404);
    if (!cafe.logo_url) return NextResponse.json({ logo_url: null });

    const path = getOwnedLogoPath(cafe.logo_url, context.cafeId);
    const { data, error: updateError } = await context.supabaseAdmin
      .from("cafes")
      .update({ logo_url: null })
      .eq("id", context.cafeId)
      .select("logo_url")
      .maybeSingle();

    if (updateError) return cafeQueryError(updateError, "save");
    if (!data) return jsonError("Your cafe could not be found.", 404);

    if (path) {
      const { error: removeError } = await context.supabaseAdmin.storage
        .from(LOGO_BUCKET)
        .remove([path]);
      if (removeError) {
        return NextResponse.json({
          logo_url: null,
          cleanupWarning: "The logo was removed from your menu, but its storage file could not be deleted.",
        });
      }
    }

    return NextResponse.json({ logo_url: null });
  } catch {
    return jsonError("Unable to remove your logo. Please try again.", 500);
  }
}
