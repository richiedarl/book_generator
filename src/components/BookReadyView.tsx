"use client";

import { useState, useEffect } from "react";
import { useBook } from "@/context/BookContext";
import { TranslationPanel } from "./TranslationPanel";
import { NextBookRecommendation } from "./NextBookRecommendation";
import { BookChapter, ImageInstruction } from "@/lib/types";

export function BookReadyView() {
  const { state, actions } = useBook();
  const { book, config, concept, chapters, qualityReport, gemini, downloadUrls, exportFormats, kindleQAReport } = state;
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imageGenError, setImageGenError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [driveUploadStatus, setDriveUploadStatus] = useState<string | null>(null);

  // Track individual image generation states
  const [imageInstructions, setImageInstructions] = useState<ImageInstruction[]>([]);
  const [imageStates, setImageStates] = useState<Record<string, { state: string; progress?: number }>>({});

  const handleDownload = (format: string) => {
    const url = downloadUrls[format];
    if (url) {
      window.open(url, "_blank");
    }
  };

  const canGenerateImages = gemini.imageGenerationAvailable;

  // Load image instructions from book state
  useEffect(() => {
    if (book?.imageInstructions && book.imageInstructions.length > 0) {
      setImageInstructions(book.imageInstructions);
      // Initialize states
      const initialStates: Record<string, { state: string }> = {};
      book.imageInstructions.forEach((inst: ImageInstruction) => {
        initialStates[inst.id] = { state: inst.state || "planned" };
      });
      setImageStates(initialStates);
    }
  }, [book]);

  const generateSingleImage = async (instruction: ImageInstruction) => {
    if (!concept || !chapters || chapters.length === 0) return;

    setImageStates(prev => ({
      ...prev,
      [instruction.id]: { state: "generating", progress: 0 }
    }));
    setImageGenError(null);

    try {
      const response = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept,
          chapters,
          visualStyle: config?.visualStyle || "warm, inviting, semi-realistic illustration style",
          imageInstructions: [instruction],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Image generation failed");
      }

      const data = await response.json();
      if (data.success && data.images && data.images.length > 0) {
        const newImage = data.images[0];
        setGeneratedImages(prev => [...prev, newImage]);
        setImageStates(prev => ({
          ...prev,
          [instruction.id]: { state: "generated", progress: 100 }
        }));
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setImageStates(prev => ({
        ...prev,
        [instruction.id]: { state: "failed", progress: 0 }
      }));
      setImageGenError(`Failed to generate ${instruction.id}: ${err.message}`);
    }
  };

  const retryImage = (instruction: ImageInstruction) => {
    generateSingleImage(instruction);
  };

  const generateAllImages = async () => {
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
          imageInstructions: imageInstructions,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Image generation failed");
      }

      const data = await response.json();
      if (data.success && data.images) {
        setGeneratedImages(data.images);
        // Update all states to generated
        const allGenerated: Record<string, { state: string; progress: number }> = {};
        imageInstructions.forEach(inst => {
          allGenerated[inst.id] = { state: "generated", progress: 100 };
        });
        setImageStates(allGenerated);
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
                    <span className="hint">{issue.suggestion}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Kindle QA Report */}
      {kindleQAReport && (
        <div className="quality-summary kindle-qa">
          <div className="quality-score">
            Kindle QA: {kindleQAReport.passed ? "PASSED" : "NEEDS REVIEW"} — Score: {kindleQAReport.score}/100
          </div>
          <p className="quality-text">{kindleQAReport.summary}</p>
          {kindleQAReport.checks.length > 0 && (
            <details className="quality-details">
              <summary>View {kindleQAReport.checks.length} checks</summary>
              <ul>
                {kindleQAReport.checks.map((check, i) => (
                  <li key={i} style={{ color: check.passed ? "var(--accent-forest)" : check.severity === "critical" ? "#a00" : "#a80" }}>
                    <b>[{check.severity.toUpperCase()}] {check.category} — {check.name}</b>: {check.message}
                    {check.details && <br />}{check.details && <span className="hint">{check.details}</span>}
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
              Generate Cover & Images
            </button>
          )}

          {canGenerateImages && imageInstructions.length > 0 && (
            <div className="image-generation-section">
              <h4>Image Generation</h4>
              <p className="hint-text">Click individual images to generate, or generate all at once.</p>
              <div className="image-list">
                {imageInstructions.map((inst) => {
                  const state = imageStates[inst.id]?.state || "planned";
                  const isGenerating = state === "generating";
                  const isGenerated = state === "generated";
                  const isFailed = state === "failed";
                  const progress = imageStates[inst.id]?.progress || 0;

                  return (
                    <div key={inst.id} className="image-item">
                      <div className="image-info">
                        <span className={`image-state-icon ${state}`}>
                          {state === "planned" && "⏳"}
                          {state === "generating" && "⏳"}
                          {state === "generated" && "✅"}
                          {state === "failed" && "❌"}
                        </span>
                        <span className="image-label">{inst.id} ({inst.placement})</span>
                        <span className="image-purpose">{inst.purpose}</span>
                      </div>
                      <div className="image-actions">
                        {isGenerating && (
                          <div className="progress-bar-small">
                            <div className="progress-fill" style={{ width: `${progress}%` }} />
                          </div>
                        )}
                        {state === "planned" && (
                          <button
                            className="btn btn-xs"
                            onClick={() => generateSingleImage(inst)}
                            disabled={isGeneratingImages}
                          >
                            Generate
                          </button>
                        )}
                        {state === "failed" && (
                          <button
                            className="btn btn-xs btn-retry"
                            onClick={() => retryImage(inst)}
                            disabled={isGeneratingImages}
                          >
                            Retry
                          </button>
                        )}
                        {isGenerated && (
                          <span className="generated-badge">Generated</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                className="btn btn-sm"
                onClick={generateAllImages}
                disabled={isGeneratingImages}
              >
                {isGeneratingImages ? "Generating All..." : "Generate All Images"}
              </button>
            </div>
          )}

          {canGenerateImages && imageInstructions.length === 0 && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={generateAllImages}
              disabled={isGeneratingImages}
            >
              {isGeneratingImages ? "Generating..." : "Generate Cover & Images"}
            </button>
          )}

          {imageGenError && (
            <p className="hint-text" style={{ color: "#a00" }}>
              ⚠ {imageGenError}
            </p>
          )}

          {generatedImages.length > 0 && (
            <p className="hint-text">
              ✅ Generated {generatedImages.length} image(s). Cover and chapter illustrations are now embedded in your book exports.
            </p>
          )}

          {driveUploadStatus && (
            <p className={driveUploadStatus.startsWith("✅") ? "success-text" : "hint-text"} style={driveUploadStatus.startsWith("✅") ? { color: "var(--accent-forest)" } : driveUploadStatus.startsWith("⚠") ? { color: "#a00" } : {}}>
              {driveUploadStatus}
            </p>
          )}

          {isUploadingDrive && (
            <p className="hint-text">
              Uploading to Google Drive...
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

      <NextBookRecommendation />

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

        .quality-summary.kindle-qa {
          border-color: var(--accent-forest);
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

        /* Image Generation Styles */
        .image-generation-section {
          background: var(--paper-soft);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 16px;
          margin-top: 12px;
        }

        .image-generation-section h4 {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent-forest);
          margin: 0 0 8px;
        }

        .image-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin: 12px 0;
        }

        .image-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 8px;
          gap: 12px;
        }

        .image-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .image-state-icon {
          font-size: 18px;
          width: 28px;
          text-align: center;
        }

        .image-label {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--ink);
          font-weight: 600;
        }

        .image-purpose {
          font-size: 12px;
          color: var(--ink-soft);
          max-width: 200px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .image-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .progress-bar-small {
          width: 80px;
          height: 6px;
          background: var(--line);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--accent-forest);
          transition: width 0.3s ease;
        }

        .btn-xs {
          font-size: 9px;
          padding: 4px 10px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .btn-retry {
          background: var(--accent-rust);
          color: white;
        }

        .btn-retry:hover {
          opacity: 0.9;
        }

        .generated-badge {
          font-size: 10px;
          color: var(--accent-forest);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}