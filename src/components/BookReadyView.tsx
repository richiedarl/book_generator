"use client";

import { useState } from "react";
import { useBook } from "@/context/BookContext";
import { TranslationPanel } from "./TranslationPanel";

export function BookReadyView() {
  const { state, actions } = useBook();
  const { book, config, concept, chapters, qualityReport, gemini, downloadUrls, exportFormats } = state;
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imageGenError, setImageGenError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [driveUploadStatus, setDriveUploadStatus] = useState<string | null>(null);

  const handleDownload = (format: string) => {
    const url = downloadUrls[format];
    if (url) {
      window.open(url, "_blank");
    }
  };

  const canGenerateImages = gemini.imageGenerationAvailable;

  const generateImages = async () => {
    if (!concept || !chapters || chapters.length === 0) return;

    setIsGeneratingImages(true);
    setImageGenError(null);

    try {
      const response = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept,
          chapters,
          visualStyle: config?.visualStyle || "warm, inviting, semi-realistic illustration style",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Image generation failed");
      }

      const data = await response.json();
      if (data.success && data.images) {
        setGeneratedImages(data.images);
      } else if (data.error) {
        setImageGenError(data.error);
      }
    } catch (err: any) {
      setImageGenError(err.message || "Failed to generate images");
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const uploadToDrive = async () => {
    if (!concept || !state.driveStatus?.authorized) return;

    setIsUploadingDrive(true);
    setDriveUploadStatus("Uploading to Google Drive...");

    try {
      // Fetch the export files from our temp storage and send them to the Drive API
      // for server-side upload. We pass the ready export URLs and let the backend
      // re-read from /tmp or regenerate as needed.
      const readyExports = exportFormats
        .filter((f) => f.status === "ready" && f.url)
        .map((f) => ({ format: f.format, url: f.url }));

      const response = await fetch("/api/drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload",
          accessToken: state.driveStatus.accessToken,
          bookTitle: concept.title,
          exports: readyExports,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await response.json();
      setDriveUploadStatus(`Successfully saved to Google Drive! Folder: ${data.bookFolderId}`);
    } catch (err: any) {
      setDriveUploadStatus(`Upload failed: ${err.message}`);
    } finally {
      setIsUploadingDrive(false);
    }
  };

  return (
    <div className="ready-view">
      <div className="eyebrow">Book Ready</div>
      <h2 className="ready-title">Your book is ready.</h2>
      <p className="ready-sub">
        {concept?.title && `${concept.title} — `}
        {concept?.subtitle && <span className="italic">{concept.subtitle}</span>}
        <span> — has been fully generated, edited, and exported.</span>
      </p>

      {qualityReport && (
        <div className="quality-summary">
          <div className="quality-score">
            Quality Score: {qualityReport.score}/100
          </div>
          <p className="quality-text">{qualityReport.summary}</p>
          {qualityReport.issues.length > 0 && (
            <details className="quality-details">
              <summary>{qualityReport.issues.length} issues found</summary>
              <ul>
                {qualityReport.issues.map((issue, i) => (
                  <li key={i}>
                    <b>[{issue.severity}] {issue.category}</b>: {issue.description}
                    <br />
                    <span className="hint">→ {issue.suggestion}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <div className="section">
        <h3>Exports</h3>
        <div className="export-grid">
          {exportFormats.map((fmt) => (
            <button
              key={fmt.format}
              className="btn btn-sm"
              onClick={() => handleDownload(fmt.format)}
              disabled={fmt.status !== "ready" || !downloadUrls[fmt.format]}
              style={{
                background: fmt.status === "ready" && downloadUrls[fmt.format]
                  ? "var(--ink)"
                  : "var(--ink-faint)",
              }}
            >
              {fmt.status === "ready" && downloadUrls[fmt.format]
                ? `Download ${fmt.format.toUpperCase()}`
                : fmt.status === "failed"
                ? `Failed: ${fmt.format.toUpperCase()}`
                : fmt.format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <h3>Optional Next Steps</h3>
        <div className="action-grid">
          <button
            className="btn btn-sm"
            onClick={() => console.log("Edit book — not yet implemented")}
            style={{ background: "var(--accent-forest)" }}
          >
            Edit Book
          </button>

          <button
            className="btn btn-sm btn-ghost"
            onClick={async () => {
              if (state.driveStatus?.authorized) {
                // Already authorized — trigger server-side upload
                await uploadToDrive();
                return;
              }

              // Step 1: Fetch the auth URL from the server
              let authUrl: string;
              try {
                const response = await fetch("/api/drive?action=auth");
                if (!response.ok) {
                  throw new Error("Failed to get auth URL");
                }
                const data = await response.json();
                authUrl = data.authUrl;
              } catch (err: any) {
                setDriveUploadStatus(`Failed to get auth URL: ${err.message}`);
                return;
              }

              // Step 2: Open Google OAuth in a popup
              const popup = window.open(authUrl, "_blank", "width=600,height=700");

              if (!popup) {
                setDriveUploadStatus("Please allow pop-ups for this site to connect Google Drive.");
                return;
              }

              // Step 3: Listen for the OAuth callback to notify us via postMessage
              const handleMessage = async (event: MessageEvent) => {
                // Verify the message is from our domain
                if (event.origin !== window.location.origin) return;

                if (event.data?.type === "DRIVE_AUTH_SUCCESS") {
                  window.removeEventListener("message", handleMessage);
                  actions.setDriveStatus({
                    authorized: true,
                    accessToken: event.data.accessToken,
                    refreshToken: event.data.refreshToken || "",
                    expiresAt: event.data.expiresAt,
                  });
                  popup.close();
                  setDriveUploadStatus(null);
                  await uploadToDrive();
                }
                if (event.data?.type === "DRIVE_AUTH_FAIL") {
                  window.removeEventListener("message", handleMessage);
                  popup.close();
                  setDriveUploadStatus("Google Drive authorization failed. Please try again.");
                }
              };

              window.addEventListener("message", handleMessage);

              // Step 4: Fallback — poll to check if popup was closed without callback
              const checkClosed = setInterval(() => {
                if (popup.closed) {
                  clearInterval(checkClosed);
                  window.removeEventListener("message", handleMessage);
                }
              }, 1000);
            }}
          >
            {state.driveStatus?.authorized ? "Save to Google Drive" : "Connect Google Drive"}
          </button>

          {state.driveStatus?.authorized && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => actions.setDriveStatus(null)}
              title="Disconnect Google Drive"
            >
              Disconnect
            </button>
          )}

          {!canGenerateImages && gemini.configured === false && (
            <button
              className="btn btn-sm btn-ghost"
              disabled
              title="Gemini API key not configured. Add GEMINI_API_KEY to enable image generation."
            >
              Generate Cover &amp; Images
            </button>
          )}

          {canGenerateImages && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={generateImages}
              disabled={isGeneratingImages}
            >
              {isGeneratingImages ? "Generating..." : "Generate Cover &amp; Images"}
            </button>
          )}

          {imageGenError && (
            <p className="hint-text" style={{ color: "#a00" }}>
              ⚠️ {imageGenError}
            </p>
          )}

          {generatedImages.length > 0 && (
            <p className="hint-text">
              ✅ Generated {generatedImages.length} image(s). Cover and chapter illustrations are now embedded in your book exports.
            </p>
          )}

          {driveUploadStatus && (
            <p className={driveUploadStatus.startsWith("✅") ? "success-text" : "hint-text"} style={driveUploadStatus.startsWith("✅") ? { color: "var(--accent-forest)" } : driveUploadStatus.startsWith("⚠️") ? { color: "#a00" } : {}}>
              {driveUploadStatus}
            </p>
          )}

          {isUploadingDrive && (
            <p className="hint-text">
              ⏳ Uploading to Google Drive...
            </p>
          )}

          <button
            className="btn btn-sm btn-ghost"
            onClick={() => actions.startNewBook()}
          >
            Start a New Book
          </button>
        </div>

        {!canGenerateImages && gemini.configured && (
          <p className="hint-text">
            Gemini is configured but image generation is not available. You can continue with your text-only book.
          </p>
        )}

        {!canGenerateImages && !gemini.configured && (
          <p className="hint-text">
            Gemini (Google AI) is not configured. Add <code>GEMINI_API_KEY</code> and <code>GEMINI_MODEL</code> to your environment to enable optional cover and image generation.
          </p>
        )}
      </div>

      <TranslationPanel />

      <style jsx>{`
        .ready-view {
          padding: 10px 0;
        }

        .eyebrow {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--accent-forest);
          margin: 0 0 10px;
        }

        .ready-title {
          font-family: var(--display);
          font-size: 28px;
          line-height: 1.2;
          margin: 0 0 10px;
          color: var(--ink);
        }

        .ready-sub {
          font-size: 15px;
          line-height: 1.6;
          color: var(--ink-soft);
          margin: 0 0 24px;
          max-width: 60ch;
        }

        .italic {
          font-style: italic;
        }

        .quality-summary {
          background: var(--paper-soft);
          border: 1px solid var(--line);
          padding: 16px 20px;
          margin-bottom: 24px;
        }

        .quality-score {
          font-family: var(--mono);
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent-forest);
          font-weight: 700;
          margin-bottom: 6px;
        }

        .quality-text {
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--ink);
          margin: 0 0 10px;
        }

        .quality-details {
          font-size: 12.5px;
        }

        .quality-details summary {
          cursor: pointer;
          color: var(--ink-soft);
          margin-top: 6px;
        }

        .quality-details ul {
          margin: 8px 0 0;
          padding-left: 20px;
        }

        .quality-details li {
          margin-bottom: 8px;
          line-height: 1.5;
        }

        .section {
          margin-bottom: 32px;
        }

        .section h3 {
          font-family: var(--mono);
          font-size: 10.5px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin: 0 0 12px;
        }

        .export-grid,
        .action-grid {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .btn-sm {
          font-size: 10.5px;
          padding: 8px 12px;
        }

        .btn-ghost {
          background: transparent;
          border: 1px solid var(--line);
          color: var(--ink-soft);
          padding: 8px 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .btn-ghost:hover {
          border-color: var(--ink);
          color: var(--ink);
        }

        .btn-ghost:disabled {
          background: var(--ink-faint);
          color: var(--paper-soft);
          border-color: var(--ink-faint);
          cursor: not-allowed;
        }

        .hint-text {
          margin-top: 12px;
          font-size: 12.5px;
          color: var(--ink-soft);
          line-height: 1.5;
        }

        code {
          background: var(--paper-deep);
          padding: 1px 5px;
          border-radius: 3px;
          font-family: var(--mono);
          font-size: 11px;
        }
      `}</style>
    </div>
  );
}
