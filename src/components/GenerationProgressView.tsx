"use client";

import { useBook } from "@/context/BookContext";

export function GenerationProgressView() {
  const { state } = useBook();
  const { generationStage, jobStages, jobStatus, jobError, isGenerating } = state;

  const isCompleted = jobStatus === "completed";
  const isFailed = jobStatus === "failed";

  return (
    <div className="progress-view">
      <div className="eyebrow">Generating Your Book</div>
      <h2 className="progress-title">
        {isCompleted ? "Your book is ready." : isFailed ? "Generation failed." : "Working on your book…"}
      </h2>
      <p className="progress-sub">
        {isCompleted
          ? "The manuscript has been generated, edited, and exported."
          : isFailed
          ? jobError || "Something went wrong during generation."
          : generationStage || "Please wait while Claude creates your book."}
      </p>

      {!isCompleted && (
        <div className="loading">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
          {generationStage || "Creating your book…"}
        </div>
      )}

      <div className="stages">
        {jobStages.map((stage) => (
          <div key={stage.name} className={`stage-row ${stage.status}`}>
            <span className="stage-name">{stage.name}</span>
            <span className={`stage-status ${stage.status}`}>
              {stage.status === "running" && "•"}
              {stage.status === "completed" && "✓"}
              {stage.status === "failed" && "✗"}
              {stage.status === "pending" && "○"}
            </span>
          </div>
        ))}
      </div>

      {isFailed && (
        <div className="error-box">
          <div className="error-title">Generation Error</div>
          <p>{jobError || "An unexpected error occurred."}</p>
          <p style={{ marginTop: "8px", fontSize: "13px", color: "var(--ink-soft)" }}>
            You can try again or start a new book.
          </p>
        </div>
      )}

      <style jsx>{`
        .progress-view {
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

        .progress-title {
          font-family: var(--display);
          font-size: 28px;
          line-height: 1.2;
          margin: 0 0 10px;
          color: var(--ink);
        }

        .progress-sub {
          font-size: 15px;
          line-height: 1.6;
          color: var(--ink-soft);
          margin: 0 0 24px;
          max-width: 56ch;
        }

        .loading {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--ink-soft);
          font-family: var(--mono);
          font-size: 12px;
          letter-spacing: 0.05em;
          padding: 20px 0;
        }

        .dot {
          width: 6px;
          height: 6px;
          background: var(--accent-gold);
          border-radius: 50%;
          animation: pulse 1s infinite ease-in-out;
        }

        .dot:nth-child(2) {
          animation-delay: 0.15s;
        }
        .dot:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.25; }
          40% { opacity: 1; }
        }

        .stages {
          background: var(--paper-soft);
          border: 1px solid var(--line);
          padding: 16px 20px;
        }

        .stage-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 13.5px;
          line-height: 1.5;
          color: var(--ink-soft);
          border-bottom: 1px dashed var(--line);
        }

        .stage-row:last-child {
          border-bottom: none;
        }

        .stage-row.running .stage-name {
          color: var(--ink);
          font-weight: 600;
        }

        .stage-row.completed .stage-name {
          color: var(--accent-forest);
        }

        .stage-row.failed .stage-name {
          color: var(--accent-rust);
        }

        .stage-status {
          font-family: var(--mono);
          font-size: 13px;
        }

        .stage-status.running { color: var(--accent-gold); }
        .stage-status.completed { color: var(--accent-forest); }
        .stage-status.failed { color: var(--accent-rust); }
        .stage-status.pending { color: var(--ink-faint); }

        .error-box {
          background: #f5e6de;
          border: 1px solid var(--accent-rust);
          color: var(--accent-rust);
          padding: 16px 18px;
          margin-top: 16px;
          font-size: 13px;
        }

        .error-title {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  );
}
