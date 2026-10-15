"use client";

import { useState } from "react";
import Link from "next/link";
import { Video, UploadCloud } from "lucide-react";
import { RETURN_KIND_LABEL, RETURN_WINDOW_DAYS, VIDEO_MAX_BYTES, VIDEO_MAX_MB, type ReturnKind } from "@/lib/returns/policy";

type Props = {
  orderNumber: string;
  contact: string;
  items: { name: string; qty: number }[];
  onDone: (message: string) => void;
  onCancel: () => void;
};

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

async function json(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed. Please try again.");
  return data;
}

/**
 * Return / exchange request with the mandatory unboxing video. The video goes up in pieces
 * (/api/returns/video), then the request is submitted with the finished upload's id.
 */
export default function ReturnRequestForm({ orderNumber, contact, items, onDone, onCancel }: Props) {
  const [kind, setKind] = useState<ReturnKind | "">("");
  const [picked, setPicked] = useState<string[]>(items.length === 1 ? [items[0].name] : []);
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");

  const busy = progress !== null;
  const ready = kind && reason.trim() && file && confirmed && (items.length <= 1 || picked.length > 0);

  function chooseFile(f: File | undefined) {
    setError("");
    if (!f) return setFile(null);
    if (!f.type.startsWith("video/")) return setError("Please choose a video file.");
    if (f.size > VIDEO_MAX_BYTES) return setError(`This video is ${mb(f.size)}. The limit is ${VIDEO_MAX_MB} MB: record in 720p or trim it.`);
    setFile(f);
  }

  async function submit() {
    if (!ready || !file) return;
    setError("");
    setProgress(0);
    try {
      const start = await json(await fetch("/api/returns/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, contact, name: file.name, mime: file.type, size: file.size }),
      }));
      const { videoId, uploadToken, chunkSize, chunkCount } = start as { videoId: string; uploadToken: string; chunkSize: number; chunkCount: number };

      for (let i = 0; i < chunkCount; i++) {
        const piece = file.slice(i * chunkSize, Math.min(file.size, (i + 1) * chunkSize));
        // Phone networks drop: retry each piece a few times before giving up.
        for (let attempt = 1; ; attempt++) {
          try {
            await json(await fetch(`/api/returns/video?id=${encodeURIComponent(videoId)}&index=${i}`, {
              method: "PUT",
              headers: { "Content-Type": "application/octet-stream", "x-upload-token": uploadToken },
              body: piece,
            }));
            break;
          } catch (e) {
            if (attempt >= 3) throw e;
            await new Promise((r) => setTimeout(r, 1500 * attempt));
          }
        }
        setProgress(Math.round(((i + 1) / chunkCount) * 100));
      }

      await json(await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, contact, kind, reason, items: picked, videoId, uploadToken }),
      }));
      onDone(kind === "return"
        ? "Your return request and video have been received. Our team will review the video and contact you."
        : "Your exchange request and video have been received. Our team will review the video and contact you.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
      setProgress(null);
    }
  }

  return (
    <div className="rr-form">
      <p className="rr-note">
        Only <strong>damaged</strong> products can be returned; everything else is <strong>exchange only</strong>, within {RETURN_WINDOW_DAYS} days of delivery.
        An <strong>unboxing video is mandatory</strong>. <Link href="/return-policy" target="_blank" className="rich-link">Read the policy</Link>
      </p>

      <fieldset disabled={busy}>
        <legend>What do you need?</legend>
        {(Object.keys(RETURN_KIND_LABEL) as ReturnKind[]).map((k) => (
          <label key={k} className={`rr-choice${kind === k ? " on" : ""}`}>
            <input type="radio" name="rr-kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
            {RETURN_KIND_LABEL[k]}
          </label>
        ))}
      </fieldset>

      {items.length > 1 && (
        <fieldset disabled={busy}>
          <legend>Which items?</legend>
          {items.map((i) => (
            <label key={i.name} className="rr-check">
              <input
                type="checkbox"
                checked={picked.includes(i.name)}
                onChange={(e) => setPicked((p) => (e.target.checked ? [...p, i.name] : p.filter((n) => n !== i.name)))}
              />
              {i.name} {i.qty > 1 && <span>× {i.qty}</span>}
            </label>
          ))}
        </fieldset>
      )}

      <label className="rr-label">
        {kind === "exchange" ? "What would you like instead, and why?" : kind === "return" ? "Describe the damage" : "Describe the issue"}
        <textarea
          className="lux-input"
          rows={3}
          maxLength={1000}
          disabled={busy}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={kind === "exchange" ? "e.g. Need the king size instead of double" : "e.g. Bedsheet has a tear near the corner"}
        />
      </label>

      <div className="rr-label">
        Unboxing video (required)
        <label className={`rr-drop${file ? " has" : ""}`}>
          <input type="file" accept="video/*" disabled={busy} onChange={(e) => chooseFile(e.target.files?.[0])} />
          {file ? <Video size={20} /> : <UploadCloud size={20} />}
          <span>{file ? `${file.name} · ${mb(file.size)}` : `Choose or record the video (up to ${VIDEO_MAX_MB} MB)`}</span>
        </label>
        <small>One continuous video from the sealed parcel (label visible) until the product is fully out. No cuts or edits.</small>
      </div>

      <label className="rr-check">
        <input type="checkbox" checked={confirmed} disabled={busy} onChange={(e) => setConfirmed(e.target.checked)} />
        I confirm this is an uncut video of opening the sealed parcel.
      </label>

      {progress !== null && (
        <div className="rr-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Video upload">
          <i style={{ width: `${progress}%` }} />
          <span>{progress < 100 ? `Uploading video… ${progress}%` : "Submitting request…"}</span>
        </div>
      )}
      {error && <p role="alert" className="rr-error">{error}</p>}

      <div className="rr-actions">
        <button type="button" className="btn indigo" disabled={!ready || busy} onClick={submit}>
          {busy ? "Please wait…" : `Submit ${kind || "request"}`}
        </button>
        <button type="button" className="btn outline" disabled={busy} onClick={onCancel}>Never mind</button>
      </div>
    </div>
  );
}
