/**
 * Supporting attachments for the book configuration form.
 * Files are read into usable content (text, Word documents, images) so they
 * can be passed to the model rather than merely listed.
 */

"use client";

import { useRef } from "react";
import { Attachment } from "@/lib/types";
import { ATTACHMENT_ACCEPT, readAttachmentFile } from "@/lib/attachment-reader";

interface AttachmentFieldProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  onWarning?: (message: string) => void;
  disabled?: boolean;
  inputId?: string;
}

function iconForType(type: string): string {
  if (type.startsWith("image/")) return "IMG";
  if (type.includes("word") || type === "docx") return "DOC";
  if (type.startsWith("text/") || type === "md" || type === "json") return "TXT";
  return "FILE";
}

export function AttachmentField({
  attachments,
  onChange,
  onWarning,
  disabled,
  inputId = "attachments",
}: AttachmentFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const results = await Promise.all(
      Array.from(fileList).map((file) => readAttachmentFile(file))
    );

    const warnings = results
      .map((result) => result.warning)
      .filter((warning): warning is string => Boolean(warning));

    if (warnings.length > 0) onWarning?.(warnings.join(" "));

    const readable = results
      .map((result) => result.attachment)
      .filter((attachment) => attachment.size > 0 || attachment.content || attachment.base64);

    onChange([...attachments, ...readable]);

    if (inputRef.current) inputRef.current.value = "";
  };

  const removeAttachment = (id: string) => {
    onChange(attachments.filter((attachment) => attachment.id !== id));
  };

  return (
    <div className="attachments-area">
      <input
        ref={inputRef}
        type="file"
        id={inputId}
        multiple
        accept={ATTACHMENT_ACCEPT}
        onChange={(event) => handleFiles(event.target.files)}
        disabled={disabled}
        className="hidden"
      />

      <div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          Add files
        </button>
      </div>

      <p className="hint">
        Notes, outlines, manuscripts, research or images (max 10 MB each). Text, Word
        and image files are read and given to the model as context.
      </p>

      {attachments.length > 0 && (
        <div className="attachments-list">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="attachment-item">
              <span className="attachment-info">
                <span className="attachment-icon">{iconForType(attachment.type)}</span>
                <span>{attachment.name}</span>
                <span className="attachment-size">{(attachment.size / 1024).toFixed(1)} KB</span>
              </span>
              <button
                type="button"
                className="btn-remove"
                onClick={() => removeAttachment(attachment.id)}
                disabled={disabled}
                aria-label={`Remove ${attachment.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
