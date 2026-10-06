import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESERVED_SLUGS = new Set(["admin", "login", "dashboard", "api", "_next"]);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonError(message, status) {
  return NextResponse.json({ error: message }, { status });
}

function hasStrongPassword(password) {
  return (
    password.length >= 12 &&
    password.length <= 128 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function isEmailAlreadyRegistered(error) {
  const code = String(error.code || "").toLowerCase();
  const message = String(error.message || "").toLowerCase();
  return (
    code.includes("email_exists") ||
    code.includes("user_already_exists") ||
    message.includes("already registered") ||
    message.includes("already exists")
  );
}

async function cleanupNewRecords(supabaseAdmin, { cafeId, userId }) {
  let cleanupSucceeded = true;

  if (userId) {
    try {
      const { error } = await supabaseAdmin.from("profiles").delete().eq("id", userId);
      if (error) cleanupSucceeded = false;
    } catch {
      cleanupSucceeded = false;
    }
  }

  if (cafeId) {
    try {
      const { error } = await supabaseAdmin.from("cafes").delete().eq("id", cafeId);
      if (error) cleanupSucceeded = false;
    } catch {
      cleanupSucceeded = false;
    }
  }

  if (userId) {
    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) cleanupSucceeded = false;
    } catch {
      cleanupSucceeded = false;
    }
  }

  return cleanupSucceeded;
}

export async function POST(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonError("Cafe creation is not configured. Please contact support.", 503);
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return jsonError("Please sign in as a super admin to create a cafe.", 401);
  }

  let supabaseAuth;
  try {
    supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch {
    return jsonError("Unable to verify your account. Please try again.", 500);
  }

  let user;
  try {
    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data.user) {
      return jsonError("Your session has expired. Please sign in again.", 401);
    }
    user = data.user;
  } catch {
    return jsonError("Unable to verify your account. Please try again.", 500);
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch {
    return jsonError("Cafe creation is not configured. Please contact support.", 503);
  }
  if (!supabaseAdmin) {
    return jsonError("Cafe creation is not configured. Please contact support.", 503);
  }

  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return jsonError("Unable to verify your admin access. Please try again.", 500);
    }
    if (profile?.role !== "super_admin") {
      return jsonError("Only a super admin can create cafes.", 403);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonError("Please check the cafe details and try again.", 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonError("Please check the cafe details and try again.", 400);
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || name.length > 100) {
      return jsonError("Enter a cafe name of 1 to 100 characters.", 400);
    }
    if (!SLUG_PATTERN.test(slug) || slug.length > 63 || RESERVED_SLUGS.has(slug)) {
      return jsonError("Use a unique, lowercase URL-safe slug.", 400);
    }
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return jsonError("Enter a valid owner email address.", 400);
    }
    if (!hasStrongPassword(password)) {
      return jsonError("Password does not meet the required security rules.", 400);
    }

    const { data: matchingCafe, error: slugLookupError } = await supabaseAdmin
      .from("cafes")
      .select("id")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();

    if (slugLookupError) {
      return jsonError("Unable to create cafe. Please try again.", 500);
    }
    if (matchingCafe) {
      return jsonError("Cafe slug already exists.", 409);
    }

    const { data: cafe, error: cafeError } = await supabaseAdmin
      .from("cafes")
      .insert({ name, slug })
      .select("id")
      .single();

    if (cafeError || !cafe) {
      if (cafeError?.code === "23505") {
        return jsonError("Cafe slug already exists.", 409);
      }
      return jsonError("Unable to create cafe. Please try again.", 500);
    }

    let cafesWithSlug;
    let duplicateCheckError;
    try {
      const result = await supabaseAdmin
        .from("cafes")
        .select("id")
        .eq("slug", slug)
        .limit(2);
      cafesWithSlug = result.data;
      duplicateCheckError = result.error;
    } catch {
      const cleanupSucceeded = await cleanupNewRecords(supabaseAdmin, { cafeId: cafe.id });
      if (!cleanupSucceeded) {
        return jsonError("Cafe creation could not be completed. Please contact support.", 500);
      }
      return jsonError("Unable to create cafe. Please try again.", 500);
    }

    if (duplicateCheckError || (cafesWithSlug || []).length > 1) {
      const cleanupSucceeded = await cleanupNewRecords(supabaseAdmin, { cafeId: cafe.id });
      if (!cleanupSucceeded) {
        return jsonError("Cafe creation could not be completed. Please contact support.", 500);
      }
      if (duplicateCheckError) {
        return jsonError("Unable to create cafe. Please try again.", 500);
      }
      return jsonError("Cafe slug already exists.", 409);
    }

    let authData;
    let authError;
    try {
      const result = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      authData = result.data;
      authError = result.error;
    } catch {
      const cleanupSucceeded = await cleanupNewRecords(supabaseAdmin, { cafeId: cafe.id });
      if (!cleanupSucceeded) {
        return jsonError("Cafe creation could not be completed. Please contact support.", 500);
      }
      return jsonError("Unable to create cafe. Please try again.", 500);
    }

    if (authError || !authData?.user) {
      const cleanupSucceeded = await cleanupNewRecords(supabaseAdmin, { cafeId: cafe.id });
      if (!cleanupSucceeded) {
        return jsonError("Cafe creation could not be completed. Please contact support.", 500);
      }
      if (authError && isEmailAlreadyRegistered(authError)) {
        return jsonError("An account with this email already exists.", 409);
      }
      if (String(authError?.code || "").toLowerCase().includes("weak_password")) {
        return jsonError("Password does not meet the required security rules.", 400);
      }
      return jsonError("Unable to create cafe. Please try again.", 500);
    }

    const ownerId = authData.user.id;
    let ownerProfileError;
    try {
      const { error } = await supabaseAdmin.from("profiles").upsert(
        {
          id: ownerId,
          role: "cafe_owner",
          cafe_id: cafe.id,
        },
        { onConflict: "id" }
      );
      ownerProfileError = error;
    } catch {
      ownerProfileError = true;
    }

    if (ownerProfileError) {
      const cleanupSucceeded = await cleanupNewRecords(supabaseAdmin, {
        cafeId: cafe.id,
        userId: ownerId,
      });
      if (!cleanupSucceeded) {
        return jsonError("Cafe creation could not be completed. Please contact support.", 500);
      }
      return jsonError("Unable to create cafe. Please try again.", 500);
    }

    return NextResponse.json({
      success: true,
      message: "Cafe created successfully. Owner account created successfully.",
    });
  } catch {
    return jsonError("Unable to create cafe. Please try again.", 500);
  }
}
