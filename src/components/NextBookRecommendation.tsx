"use client";

import { useState, useEffect } from "react";
import { useBook } from "@/context/BookContext";
import { BookConcept, BookConfig } from "@/lib/types";

export interface NextBookIdea {
  title: string;
  subtitle: string;
  rationale: string;
  targetAudience: string;
  keyTopics: string[];
  estimatedLength: string;
  category: string;
}

export function NextBookRecommendation() {
  const { state, actions } = useBook();
  const { book, concept, config, chapters } = state;
  const [recommendations, setRecommendations] = useState<NextBookIdea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (concept && config) {
      generateRecommendations();
    }
  }, [concept, config]);

  const generateRecommendations = async () => {
    if (!concept || !config) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/next-book-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept,
          config,
          chapterTitles: chapters.map(c => c.title),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate recommendations");
      }

      const data = await response.json();
      if (data.success && data.recommendations) {
        setRecommendations(data.recommendations);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate recommendations");
    } finally {
      setIsLoading(false);
    }
  };

  if (recommendations.length === 0 && !isLoading && !error) {
    return null;
  }

  return (
    <div className="next-book-section">
      <div className="section-header">
        <h3>What to Write Next?</h3>
        <p className="section-subtitle">
          Based on "{concept?.title}", here are ideas for your next book:
        </p>
      </div>

      {isLoading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Analyzing your book and generating ideas...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>⚠ {error}</p>
          <button className="btn btn-sm" onClick={generateRecommendations}>
            Try Again
          </button>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="recommendations-grid">
          {recommendations.map((rec, index) => (
            <div key={index} className="recommendation-card">
              <div className="rec-header">
                <span className="rec-number">#{index + 1}</span>
                <span className="rec-category">{rec.category}</span>
              </div>
              <h4 className="rec-title">{rec.title}</h4>
              <p className="rec-subtitle">{rec.subtitle}</p>
              <p className="rec-rationale">{rec.rationale}</p>
              <div className="rec-meta">
                <span className="rec-audience">👥 {rec.targetAudience}</span>
                <span className="rec-length">📄 {rec.estimatedLength}</span>
              </div>
              <div className="rec-topics">
                {rec.keyTopics.map((topic, i) => (
                  <span key={i} className="topic-tag">{topic}</span>
                ))}
              </div>
              <button
                className="btn btn-primary btn-start-rec"
                onClick={() => startNewBookFromRecommendation(rec)}
              >
                Start This Book
              </button>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .next-book-section {
          margin-top: 40px;
          padding-top: 32px;
          border-top: 1px solid var(--line);
        }

        .section-header {
          margin-bottom: 24px;
        }

        .section-header h3 {
          font-family: var(--mono);
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent-forest);
          margin: 0 0 8px;
        }

        .section-subtitle {
          font-size: 14px;
          color: var(--ink-soft);
          margin: 0;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px;
          color: var(--ink-soft);
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--line);
          border-top-color: var(--accent-forest);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-state {
          padding: 16px;
          background: #fef0f0;
          border: 1px solid #fcc;
          border-radius: 8px;
          color: var(--accent-rust);
        }

        .recommendations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .recommendation-card {
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 24px;
          transition: all 0.2s ease;
        }

        .recommendation-card:hover {
          border-color: var(--accent-forest);
          box-shadow: 0 4px 12px rgba(34, 48, 43, 0.08);
          transform: translateY(-2px);
        }

        .rec-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .rec-number {
          font-family: var(--mono);
          font-size: 10px;
          color: var(--ink-faint);
        }

        .rec-category {
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--accent-forest);
          background: rgba(59, 93, 80, 0.1);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .rec-title {
          font-family: var(--display);
          font-size: 18px;
          line-height: 1.3;
          margin: 0 0 6px;
          color: var(--ink);
        }

        .rec-subtitle {
          font-size: 13px;
          color: var(--ink-soft);
          font-style: italic;
          margin: 0 0 12px;
        }

        .rec-rationale {
          font-size: 13px;
          line-height: 1.6;
          color: var(--ink);
          margin: 0 0 16px;
        }

        .rec-meta {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
          font-size: 11px;
          color: var(--ink-faint);
        }

        .rec-topics {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 16px;
        }

        .topic-tag {
          font-size: 10px;
          background: var(--paper-soft);
          border: 1px solid var(--line);
          padding: 2px 8px;
          border-radius: 12px;
          color: var(--ink-soft);
        }

        .btn-start-rec {
          width: 100%;
          background: var(--accent-forest);
          color: white;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-start-rec:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(34, 48, 43, 0.2);
        }
      `}</style>
    </div>
  );
}

async function startNewBookFromRecommendation(rec: NextBookIdea) {
  // This would reset the form and pre-fill with the recommendation
  // For now, we'll just navigate back to the config form with the data
  // In a full implementation, this would populate the BookConfigForm
  console.log("Start new book from recommendation:", rec);
}