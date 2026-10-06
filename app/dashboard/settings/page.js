"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Crop, Eye, EyeOff, ImagePlus, Settings as SettingsIcon, Trash2 } from "lucide-react";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/userProfile";
import LoadingState from "@/components/LoadingState";

const EMPTY_CAFE = {
  name: "",
  slug: "",
  address: "",
  location_url: "",
  phone: "",
  whatsapp: "",
  instagram_url: "",
  opening_hours: "",
  tagline: "",
  description: "",
};

const CAFE_FIELDS = [
  { name: "name", label: "Cafe name", required: true, maxLength: 100 },
  { name: "address", label: "Address", maxLength: 500 },
  { name: "location_url", label: "Location / Google Maps URL", type: "url", maxLength: 2048 },
  { name: "phone", label: "Phone number", type: "tel", maxLength: 32 },
  { name: "whatsapp", label: "WhatsApp number", type: "tel", maxLength: 32 },
  { name: "instagram_url", label: "Instagram URL", type: "url", maxLength: 2048 },
  { name: "opening_hours", label: "Opening hours", placeholder: "7:00 AM – 10:30 PM", maxLength: 160 },
  { name: "tagline", label: "Tagline", maxLength: 160 },
];
function getPasswordError(error) {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();
  if (
    code.includes("invalid_credentials") ||
    code.includes("invalid_grant") ||
    message.includes("invalid login credentials")
  ) {
    return "Current password is incorrect.";
  }
  return "Password could not be changed. Please try again.";
}

function isStrongPassword(password) {
  return (
    password.length >= 12 &&
    password.length <= 128 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export default function DashboardSettingsPage() {
  const router = useRouter();
  const logoInputRef = useRef(null);
  const cropDialogRef = useRef(null);
  const objectUrlsRef = useRef(new Set());
  const croppedAreaPixelsRef = useRef(null);
  const { profile, loading: profileLoading } = useProfile("cafe_owner");
  const [cafe, setCafe] = useState(EMPTY_CAFE);
  const [settingsReady, setSettingsReady] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [savingCafe, setSavingCafe] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);
  const [loadingLogoForCrop, setLoadingLogoForCrop] = useState(false);
  const [processingCrop, setProcessingCrop] = useState(false);
  const [cropCandidate, setCropCandidate] = useState(null);
  const [cropPreview, setCropPreview] = useState(null);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [cafeNotice, setCafeNotice] = useState(null);
  const [logoNotice, setLogoNotice] = useState(null);
  const [passwordNotice, setPasswordNotice] = useState(null);
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  useEffect(
    () => () => {
      for (const objectUrl of objectUrlsRef.current) URL.revokeObjectURL(objectUrl);
    },
    []
  );

  useEffect(() => {
    if (!cropCandidate) return undefined;
    const frame = requestAnimationFrame(() => {
      cropDialogRef.current?.querySelector("[data-crop-stage]")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [cropCandidate]);

  useEffect(() => {
    if (profileLoading || !profile) return;

    let cancelled = false;
    async function loadCafe() {
      setPageLoading(true);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          router.replace("/login");
          return;
        }
        const response = await fetch("/api/dashboard/settings", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) {
          if (!cancelled) setCafeNotice({ type: "error", text: result.error || "Unable to load cafe information." });
          return;
        }
        if (!cancelled) {
          setCafe({ ...EMPTY_CAFE, ...result.cafe });
          setSettingsReady(result.settingsReady !== false);
        }
      } catch {
        if (!cancelled) setCafeNotice({ type: "error", text: "Unable to load cafe information. Please try again." });
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    }

    loadCafe();
    return () => {
      cancelled = true;
    };
  }, [profile, profileLoading, router]);

  function updateCafeField(field, value) {
    setCafe((current) => ({ ...current, [field]: value }));
  }

  function createTrackedObjectUrl(file) {
    const objectUrl = URL.createObjectURL(file);
    objectUrlsRef.current.add(objectUrl);
    return objectUrl;
  }

  function releaseObjectUrl(objectUrl) {
    if (!objectUrl) return;
    URL.revokeObjectURL(objectUrl);
    objectUrlsRef.current.delete(objectUrl);
  }

  function cancelLogoCrop() {
    releaseObjectUrl(cropCandidate?.url);
    setCropCandidate(null);
  }

  async function selectCafeLogo(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      setLogoNotice({ type: "error", text: "Choose a PNG, JPG, JPEG, or WEBP image." });
      return;
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      setLogoNotice({ type: "error", text: "Logo image must be no larger than 5 MB." });
      return;
    }

    releaseObjectUrl(cropCandidate?.url);
    releaseObjectUrl(cropPreview?.url);
    const objectUrl = createTrackedObjectUrl(file);
    const image = new Image();
    image.onload = () => {
      if (
        image.naturalWidth > 12000 ||
        image.naturalHeight > 12000 ||
        image.naturalWidth * image.naturalHeight > 40_000_000
      ) {
        releaseObjectUrl(objectUrl);
        setLogoNotice({ type: "error", text: "This image is too large to crop. Choose a smaller image." });
        return;
      }
      setCropCandidate({
        file,
        url: objectUrl,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      setCropPosition({ x: 0, y: 0 });
      setCropZoom(1);
      croppedAreaPixelsRef.current = null;
      setCropPreview(null);
      setLogoNotice(null);
    };
    image.onerror = () => {
      setLogoNotice({ type: "error", text: "This image could not be opened. Choose another image." });
      releaseObjectUrl(objectUrl);
    };
    image.src = objectUrl;
  }

  async function saveLogoCrop() {
    if (!cropCandidate || processingCrop) return;

    setProcessingCrop(true);
    setLogoNotice(null);
    try {
      const image = new Image();
      image.src = cropCandidate.url;
      await image.decode();
      const croppedArea = croppedAreaPixelsRef.current;
      if (!croppedArea) {
        setLogoNotice({ type: "error", text: "Adjust the crop before saving your logo." });
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) {
        setLogoNotice({ type: "error", text: "Unable to prepare the cropped logo. Please try again." });
        return;
      }

      context.drawImage(
        image,
        croppedArea.x,
        croppedArea.y,
        croppedArea.width,
        croppedArea.height,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) {
        setLogoNotice({ type: "error", text: "Unable to prepare the cropped logo. Please try again." });
        return;
      }
      const file = new File([blob], "cafe-logo.png", { type: "image/png" });
      releaseObjectUrl(cropPreview?.url);
      const previewUrl = createTrackedObjectUrl(file);
      setCropPreview({ file, url: previewUrl });
      releaseObjectUrl(cropCandidate.url);
      setCropCandidate(null);
      await uploadCafeLogo(file, previewUrl);
    } catch {
      setLogoNotice({ type: "error", text: "Unable to prepare the cropped logo. Please try again." });
    } finally {
      setProcessingCrop(false);
    }
  }

  function reopenLogoCrop() {
    if (!cropPreview) return;
    const objectUrl = createTrackedObjectUrl(cropPreview.file);
    const image = new Image();
    image.onload = () => {
      setCropCandidate({
        file: cropPreview.file,
        url: objectUrl,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      setCropPosition({ x: 0, y: 0 });
      setCropZoom(1);
      croppedAreaPixelsRef.current = null;
    };
    image.onerror = () => {
      releaseObjectUrl(objectUrl);
      setLogoNotice({ type: "error", text: "Unable to reopen the crop editor. Please choose the image again." });
    };
    image.src = objectUrl;
  }

  async function adjustSavedLogo() {
    if (!cafe.logo_url || loadingLogoForCrop || uploadingLogo || removingLogo) return;

    setLogoNotice(null);
    setLoadingLogoForCrop(true);
    let objectUrl;
    try {
      const response = await fetch(cafe.logo_url, { cache: "no-store" });
      if (!response.ok) throw new Error("logo_fetch_failed");

      const blob = await response.blob();
      const supportedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
      if (!supportedTypes.has(blob.type) || blob.size <= 0 || blob.size > 5 * 1024 * 1024) {
        throw new Error("unsupported_logo");
      }

      const file = new File([blob], "cafe-logo", { type: blob.type });
      objectUrl = createTrackedObjectUrl(file);
      const image = new Image();
      image.src = objectUrl;
      await image.decode();

      if (
        image.naturalWidth > 12000 ||
        image.naturalHeight > 12000 ||
        image.naturalWidth * image.naturalHeight > 40_000_000
      ) {
        releaseObjectUrl(objectUrl);
        throw new Error("image_dimensions");
      }

      releaseObjectUrl(cropCandidate?.url);
      releaseObjectUrl(cropPreview?.url);
      setCropCandidate({
        file,
        url: objectUrl,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      setCropPreview(null);
      setCropPosition({ x: 0, y: 0 });
      setCropZoom(1);
      croppedAreaPixelsRef.current = null;
    } catch {
      releaseObjectUrl(objectUrl);
      setLogoNotice({
        type: "error",
        text: "Unable to load your saved logo for adjustment. Please try replacing it with the original image.",
      });
    } finally {
      setLoadingLogoForCrop(false);
    }
  }

  async function uploadCafeLogo(fileToUpload = cropPreview?.file, previewUrl = cropPreview?.url) {
    if (!fileToUpload) return;

    setLogoNotice(null);
    setUploadingLogo(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setLogoNotice({ type: "error", text: "Your session has expired. Please sign in again." });
        return;
      }

      const formData = new FormData();
      formData.append("logo", fileToUpload);
      const response = await fetch("/api/dashboard/settings", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        setLogoNotice({ type: "error", text: result.error || "Unable to upload your logo. Please try again." });
        return;
      }

      setCafe((current) => ({ ...current, logo_url: result.logo_url }));
      releaseObjectUrl(previewUrl);
      setCropPreview(null);
      setLogoNotice({
        type: result.cleanupWarning ? "error" : "success",
        text: result.cleanupWarning || "Cafe logo updated successfully.",
      });
    } catch {
      setLogoNotice({ type: "error", text: "Unable to upload your logo. Please try again." });
    } finally {
      setUploadingLogo(false);
    }
  }

  async function removeCafeLogo() {
    setLogoNotice(null);
    setRemovingLogo(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setLogoNotice({ type: "error", text: "Your session has expired. Please sign in again." });
        return;
      }

      const response = await fetch("/api/dashboard/settings", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json();
      if (!response.ok) {
        setLogoNotice({ type: "error", text: result.error || "Unable to remove your logo. Please try again." });
        return;
      }

      setCafe((current) => ({ ...current, logo_url: null }));
      releaseObjectUrl(cropPreview?.url);
      setCropPreview(null);
      setLogoNotice({
        type: result.cleanupWarning ? "error" : "success",
        text: result.cleanupWarning || "Cafe logo removed successfully.",
      });
    } catch {
      setLogoNotice({ type: "error", text: "Unable to remove your logo. Please try again." });
    } finally {
      setRemovingLogo(false);
    }
  }

  async function saveCafeInformation(event) {
    event.preventDefault();
    setCafeNotice(null);
    setSavingCafe(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setCafeNotice({ type: "error", text: "Your session has expired. Please sign in again." });
        return;
      }
      const response = await fetch("/api/dashboard/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cafe),
      });
      const result = await response.json();
      if (!response.ok) {
        setCafeNotice({ type: "error", text: result.error || "Unable to save cafe information. Please try again." });
        return;
      }
      setCafe({ ...EMPTY_CAFE, ...result.cafe });
      setCafeNotice({ type: "success", text: "Your cafe information has been updated." });
    } catch {
      setCafeNotice({ type: "error", text: "Unable to save cafe information. Please try again." });
    } finally {
      setSavingCafe(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setPasswordNotice(null);
    if (!passwords.current || !passwords.next || !passwords.confirm) {
      setPasswordNotice({ type: "error", text: "Complete all password fields to continue." });
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordNotice({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (!isStrongPassword(passwords.next)) {
      setPasswordNotice({ type: "error", text: "Password must meet the minimum security requirements." });
      return;
    }
    if (passwords.next === passwords.current) {
      setPasswordNotice({ type: "error", text: "Choose a new password different from your current password." });
      return;
    }

    setChangingPassword(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (userError || !email) {
        setPasswordNotice({ type: "error", text: "Password could not be changed. Please try again." });
        return;
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: passwords.current,
      });
      if (verifyError) {
        setPasswordNotice({ type: "error", text: getPasswordError(verifyError) });
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: passwords.next });
      if (updateError) {
        const code = String(updateError.code || "").toLowerCase();
        setPasswordNotice({
          type: "error",
          text: code.includes("weak_password")
            ? "Password must meet the minimum security requirements."
            : "Password could not be changed. Please try again.",
        });
        return;
      }

      setPasswords({ current: "", next: "", confirm: "" });
      setShowPassword({ current: false, next: false, confirm: false });
      setPasswordNotice({ type: "success", text: "Your password has been changed successfully." });
    } catch {
      setPasswordNotice({ type: "error", text: "Password could not be changed. Please try again." });
    } finally {
      setChangingPassword(false);
    }
  }

  if (profileLoading || pageLoading) {
    return (
      <main className="min-h-screen bg-[#fafaf8] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <LoadingState label="Loading cafe settings..." />
        </div>
      </main>
    );
  }

  const noticeClass = (notice) =>
    `rounded-[12px] border px-4 py-3 text-sm ${
      notice.type === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-red-200 bg-red-50 text-red-700"
    }`;

  return (
    <main className="min-h-screen bg-[#fafaf8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl animate-[fadeIn_0.35s_ease-out]">
        <header className="panel mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="label">RASA</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-[#111111]">Settings</h1>
          </div>
          <Link href="/dashboard" className="secondary-button gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </header>

        <section className="panel mb-6 p-5 sm:p-7">
          <div className="mb-5">
            <h2 className="text-xl font-semibold tracking-[-0.04em] text-[#111111]">Cafe Logo</h2>
            <p className="mt-1 text-sm leading-6 text-[#5f5a56]">
              Upload and adjust a square logo preview for your public menu. PNG, JPG, or WEBP up to 5 MB.
            </p>
          </div>

          {logoNotice && (
            <p
              role={logoNotice.type === "success" ? "status" : "alert"}
              className={`${noticeClass(logoNotice)} mb-4`}
            >
              {logoNotice.text}
            </p>
          )}

          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            {cropPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cropPreview.url}
                alt={`${cafe.name || "Cafe"} logo preview`}
                className="h-24 w-24 rounded-2xl border border-black/8 bg-[#f5f5f2] object-contain p-1"
              />
            ) : cafe.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cafe.logo_url}
                alt={`${cafe.name || "Cafe"} logo`}
                className="h-24 w-24 rounded-2xl border border-black/8 bg-[#f5f5f2] object-contain p-1"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-black/15 bg-[#f5f5f2] text-[#8a817b]">
                <ImagePlus className="h-7 w-7" strokeWidth={1.7} aria-hidden="true" />
                <span className="sr-only">No cafe logo uploaded</span>
              </div>
            )}

            <div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                onChange={selectCafeLogo}
                className="sr-only"
                aria-label="Choose cafe logo image"
                disabled={uploadingLogo || removingLogo || loadingLogoForCrop}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo || removingLogo || loadingLogoForCrop}
                  className="primary-button gap-2"
                >
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  {cafe.logo_url ? "Replace Logo" : "Choose Logo"}
                </button>
                {cropPreview && (
                  <>
                    <button
                      type="button"
                      onClick={reopenLogoCrop}
                      disabled={uploadingLogo}
                      className="secondary-button gap-2"
                    >
                      <Crop className="h-4 w-4" aria-hidden="true" />
                      Adjust crop
                    </button>
                    <button
                      type="button"
                      onClick={() => setCropPreview(null)}
                      disabled={uploadingLogo}
                      className="secondary-button"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={uploadCafeLogo}
                      disabled={uploadingLogo}
                      className="primary-button gap-2"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      {uploadingLogo ? "Saving logo..." : "Save Logo"}
                    </button>
                  </>
                )}
                {cafe.logo_url && !cropPreview && (
                  <button
                    type="button"
                    onClick={adjustSavedLogo}
                    disabled={loadingLogoForCrop || uploadingLogo || removingLogo}
                    className="secondary-button gap-2"
                  >
                    <Crop className="h-4 w-4" aria-hidden="true" />
                    {loadingLogoForCrop ? "Loading logo..." : "Adjust Logo"}
                  </button>
                )}
                {cafe.logo_url && !cropPreview && (
                  <button
                    type="button"
                    onClick={removeCafeLogo}
                    disabled={removingLogo || uploadingLogo}
                    className="secondary-button gap-2 text-[#a44337] hover:border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {removingLogo ? "Removing..." : "Remove Logo"}
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs leading-5 text-[#6b625d]">
                Accepted formats: PNG, JPG, JPEG, WEBP. Maximum size: 5 MB.
              </p>
            </div>
          </div>

          {cropCandidate && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#111111]/60 px-3 py-5 backdrop-blur-[2px] sm:px-5"
              role="presentation"
            >
              <section
                ref={cropDialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="logo-crop-title"
                aria-describedby="logo-crop-instructions"
                onKeyDown={(event) => {
                  if (event.key === "Escape" && !processingCrop && !uploadingLogo) {
                    event.stopPropagation();
                    cancelLogoCrop();
                    return;
                  }
                  if (event.key !== "Tab") return;
                  const focusable = cropDialogRef.current?.querySelectorAll(
                    'button:not([disabled]), input:not([disabled])'
                  );
                  if (!focusable?.length) return;
                  const first = focusable[0];
                  const last = focusable[focusable.length - 1];
                  if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                  } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                  }
                }}
                className="my-auto w-full max-w-lg rounded-[20px] border border-black/5 bg-[#fafaf8] p-4 shadow-[0_28px_80px_rgba(17,17,17,0.25)] sm:p-6"
              >
                <div>
                  <p className="label">Cafe branding</p>
                  <h3 id="logo-crop-title" className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[#111111]">
                    Adjust your logo
                  </h3>
                  <p id="logo-crop-instructions" className="mt-1 text-sm leading-5 text-[#5f5a56]">
                    Drag to reposition. Pinch or scroll to zoom.
                  </p>
                </div>

                <div className="relative mx-auto mt-5 h-[280px] w-full max-w-[320px] overflow-hidden rounded-[14px] bg-[#e8e4de]">
                  <Cropper
                    image={cropCandidate.url}
                    crop={cropPosition}
                    zoom={cropZoom}
                    aspect={1}
                    cropSize={{ width: 248, height: 248 }}
                    minZoom={1}
                    maxZoom={3}
                    zoomWithScroll
                    showGrid={false}
                    restrictPosition
                    onCropChange={setCropPosition}
                    onZoomChange={setCropZoom}
                    onCropComplete={(_, croppedAreaPixels) => {
                      croppedAreaPixelsRef.current = croppedAreaPixels;
                    }}
                    classes={{
                      containerClassName: "rounded-[14px]",
                      mediaClassName: "select-none",
                      cropAreaClassName: "border-2 border-white shadow-[0_0_0_9999px_rgba(20,17,14,0.42)]",
                    }}
                  />
                </div>

                <div className="mt-4">
                  <label htmlFor="logo-zoom" className="label mb-2 block">Zoom</label>
                  <input
                    id="logo-zoom"
                    aria-label="Logo zoom"
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={cropZoom}
                    onChange={(event) => setCropZoom(Number(event.target.value))}
                    className="w-full accent-[#8f6232]"
                  />
                </div>

                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setCropPosition({ x: 0, y: 0 });
                      setCropZoom(1);
                      croppedAreaPixelsRef.current = null;
                    }}
                    disabled={processingCrop || uploadingLogo}
                    className="secondary-button"
                    data-crop-stage
                  >
                    Reset
                  </button>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={cancelLogoCrop}
                      disabled={processingCrop || uploadingLogo}
                      className="secondary-button"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveLogoCrop}
                      disabled={processingCrop || uploadingLogo}
                      className="primary-button gap-2"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      {processingCrop || uploadingLogo ? "Saving Logo..." : "Save Logo"}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </section>

        <section className="panel p-5 sm:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-[-0.04em] text-[#111111]">Cafe Information</h2>
            <p className="mt-1 text-sm leading-6 text-[#5f5a56]">
              Keep your cafe details up to date. Your QR menu address stays the same.
            </p>
          </div>

          {!settingsReady && (
            <p className="mb-5 rounded-[12px] border border-[#eadcc8] bg-[#fffaf1] px-4 py-3 text-sm leading-6 text-[#765a3c]">
              Your cafe profile is ready to complete, but its settings columns are not installed in the database yet. Run the cafe settings migration in your Supabase SQL Editor, then refresh this page to save your details.
            </p>
          )}

          {cafeNotice && <p role={cafeNotice.type === "success" ? "status" : "alert"} className={`${noticeClass(cafeNotice)} mb-5`}>{cafeNotice.text}</p>}

          <form onSubmit={saveCafeInformation} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {CAFE_FIELDS.map((field) => (
                <div key={field.name}>
                  <label htmlFor={field.name} className="label mb-2 block">{field.label}</label>
                  <input
                    id={field.name}
                    type={field.type || "text"}
                    required={field.required}
                    maxLength={field.maxLength}
                    value={cafe[field.name] || ""}
                    onChange={(event) => updateCafeField(field.name, event.target.value)}
                    placeholder={field.placeholder}
                    className="field"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label htmlFor="cafe-description" className="label mb-2 block">Description</label>
                <textarea
                  id="cafe-description"
                  maxLength={2000}
                  rows={4}
                  value={cafe.description || ""}
                  onChange={(event) => updateCafeField("description", event.target.value)}
                  className="field resize-y"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="cafe-slug" className="label mb-2 block">Menu URL slug</label>
                <input id="cafe-slug" value={cafe.slug || ""} readOnly className="field cursor-not-allowed bg-[#f5f5f2] text-[#6b625d]" />
                <p className="mt-2 text-xs leading-5 text-[#6b625d]">This slug is permanent so printed QR codes keep working.</p>
              </div>
            </div>

            <button disabled={savingCafe || !settingsReady} className="primary-button min-w-36">
              {savingCafe ? "Saving changes..." : settingsReady ? "Save Changes" : "Database setup required"}
            </button>
          </form>
        </section>

        <section className="panel mt-6 p-5 sm:p-7">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#f5f5f2] text-[#111111]">
              <SettingsIcon className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.04em] text-[#111111]">Security</h2>
              <p className="mt-1 text-sm leading-6 text-[#5f5a56]">Change the password used to sign in to RASA.</p>
              <Link href="/forgot-password" className="mt-2 inline-flex text-sm font-medium text-[#111111] underline underline-offset-4">
                Forgot your password?
              </Link>
            </div>
          </div>

          {passwordNotice && <p role={passwordNotice.type === "success" ? "status" : "alert"} className={`${noticeClass(passwordNotice)} mb-5`}>{passwordNotice.text}</p>}

          <form onSubmit={changePassword} className="space-y-4">
            {[
              { key: "current", label: "Current password", autoComplete: "current-password" },
              { key: "next", label: "New password", autoComplete: "new-password" },
              { key: "confirm", label: "Confirm new password", autoComplete: "new-password" },
            ].map((field) => (
              <div key={field.key}>
                <label htmlFor={`password-${field.key}`} className="label mb-2 block">{field.label}</label>
                <div className="relative">
                  <input
                    id={`password-${field.key}`}
                    type={showPassword[field.key] ? "text" : "password"}
                    autoComplete={field.autoComplete}
                    minLength={field.key === "current" ? undefined : 12}
                    maxLength={128}
                    value={passwords[field.key]}
                    onChange={(event) => setPasswords((current) => ({ ...current, [field.key]: event.target.value }))}
                    className="field pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => ({ ...current, [field.key]: !current[field.key] }))}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[12px] text-[#6b625d] transition-colors hover:text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/20"
                    aria-label={`${showPassword[field.key] ? "Hide" : "Show"} ${field.label.toLowerCase()}`}
                    aria-pressed={showPassword[field.key]}
                  >
                    {showPassword[field.key] ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.8} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.8} />}
                  </button>
                </div>
              </div>
            ))}
            <p className="text-xs leading-5 text-[#6b625d]">Use at least 12 characters, including uppercase and lowercase letters, a number, and a symbol.</p>
            <button disabled={changingPassword} className="primary-button min-w-40">
              {changingPassword ? "Changing password..." : "Change Password"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
