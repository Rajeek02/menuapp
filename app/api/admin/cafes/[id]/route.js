import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STORAGE_BUCKETS = ["cafe-logos", "menu-images"];

function jsonError(message, status) {
  return NextResponse.json({ error: message }, { status });
}

function matchesCafeName(enteredName, cafeName) {
  return (
    typeof enteredName === "string" &&
    enteredName.trim().toLowerCase() === cafeName.trim().toLowerCase()
  );
}

function getCafeStoragePath(publicUrl, bucket, cafeId, supabaseOrigin) {
  if (!publicUrl) return null;

  try {
    const url = new URL(publicUrl);
    if (url.origin !== supabaseOrigin) return null;
    const publicPrefix = `/storage/v1/object/public/${bucket}/`;
    if (!url.pathname.startsWith(publicPrefix)) return null;

    const path = decodeURIComponent(url.pathname.slice(publicPrefix.length));
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

async function verifySuperAdmin(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return { response: jsonError("Cafe deletion is not available right now.", 503) };
  }

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return { response: jsonError("Please sign in as a super admin.", 401) };
  }

  try {
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) {
      return { response: jsonError("Your session has expired. Please sign in again.", 401) };
    }

    const adminClient = createSupabaseAdminClient();
    if (!adminClient) {
      return { response: jsonError("Cafe deletion is not available right now.", 503) };
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      return { response: jsonError("Unable to verify your admin access.", 500) };
    }
    if (profile?.role !== "super_admin") {
      return { response: jsonError("Only a super admin can delete a cafe.", 403) };
    }

    return {
      adminClient,
      supabaseOrigin: new URL(supabaseUrl).origin,
    };
  } catch {
    return { response: jsonError("Unable to verify your admin access.", 500) };
  }
}

export async function DELETE(request, { params }) {
  const authorization = await verifySuperAdmin(request);
  if (authorization.response) return authorization.response;

  const { id } = await params;
  if (!id || typeof id !== "string") {
    return jsonError("Cafe not found.", 404);
  }

  try {
    let confirmationName;
    try {
      ({ confirmationName } = await request.json());
    } catch {
      return jsonError("Enter the cafe name to confirm deletion.", 400);
    }

    const { data: cafe, error: cafeError } = await authorization.adminClient
      .from("cafes")
      .select("id, name, logo_url")
      .eq("id", id)
      .maybeSingle();

    if (cafeError) return jsonError("Unable to delete this cafe. Please try again.", 500);
    if (!cafe) return jsonError("Cafe not found.", 404);
    if (!matchesCafeName(confirmationName, cafe.name)) {
      return jsonError("Enter the cafe name to confirm deletion.", 400);
    }

    const [
      { data: ownerProfiles, error: ownerProfileError },
      { data: menuItems, error: menuItemError },
    ] = await Promise.all([
      authorization.adminClient
        .from("profiles")
        .select("id")
        .eq("cafe_id", cafe.id)
        .eq("role", "cafe_owner"),
      authorization.adminClient
        .from("items")
        .select("image_url")
        .eq("cafe_id", cafe.id),
    ]);

    if (ownerProfileError || menuItemError) {
      return jsonError("Unable to delete this cafe. Please try again.", 500);
    }

    const ownerIds = (ownerProfiles || []).map((profile) => profile.id);
    for (const ownerId of ownerIds) {
      const { error: authDeleteError } = await authorization.adminClient.auth.admin.deleteUser(ownerId);
      if (authDeleteError && authDeleteError.code !== "user_not_found" && authDeleteError.status !== 404) {
        return jsonError("Unable to delete this cafe. Please try again.", 500);
      }
    }

    const storagePaths = new Map(STORAGE_BUCKETS.map((bucket) => [bucket, new Set()]));
    const logoPath = getCafeStoragePath(
      cafe.logo_url,
      "cafe-logos",
      cafe.id,
      authorization.supabaseOrigin
    );
    if (logoPath) storagePaths.get("cafe-logos").add(logoPath);

    for (const item of menuItems || []) {
      const imagePath = getCafeStoragePath(
        item.image_url,
        "menu-images",
        cafe.id,
        authorization.supabaseOrigin
      );
      if (imagePath) storagePaths.get("menu-images").add(imagePath);
    }

    const storageCleanup = await Promise.all(
      [...storagePaths].map(async ([bucket, paths]) => {
        if (paths.size === 0) return true;
        const { error } = await authorization.adminClient.storage
          .from(bucket)
          .remove([...paths]);
        return !error;
      })
    );
    if (storageCleanup.some((succeeded) => !succeeded)) {
      return jsonError("Unable to delete this cafe. Please try again.", 500);
    }

    const { error: itemDeleteError } = await authorization.adminClient
      .from("items")
      .delete()
      .eq("cafe_id", cafe.id);
    if (itemDeleteError) {
      return jsonError("Unable to delete this cafe. Please try again.", 500);
    }

    const { error: categoryDeleteError } = await authorization.adminClient
      .from("categories")
      .delete()
      .eq("cafe_id", cafe.id);
    if (categoryDeleteError) {
      return jsonError("Unable to delete this cafe. Please try again.", 500);
    }

    if (ownerIds.length > 0) {
      const { error: profileDeleteError } = await authorization.adminClient
        .from("profiles")
        .delete()
        .in("id", ownerIds)
        .eq("cafe_id", cafe.id)
        .eq("role", "cafe_owner");
      if (profileDeleteError) {
        return jsonError("Unable to delete this cafe. Please try again.", 500);
      }
    }

    const { error: cafeDeleteError, count } = await authorization.adminClient
      .from("cafes")
      .delete({ count: "exact" })
      .eq("id", cafe.id);
    if (cafeDeleteError || count === 0) {
      return jsonError("Unable to delete this cafe. Please try again.", 500);
    }

    return NextResponse.json({ success: true });
  } catch {
    return jsonError("Unable to delete this cafe. Please try again.", 500);
  }
}
