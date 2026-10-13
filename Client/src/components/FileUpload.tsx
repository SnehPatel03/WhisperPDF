import { FileText, FileUp, LoaderCircle, X } from "lucide-react";
import * as React from "react";
import { SignOutButton } from "@clerk/clerk-react";

interface FileUploadProps {
  onFileChange: (fileName: string | null) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileChange }) => {
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const selectFile = async (nextFile: File) => {
    if (nextFile.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }

    setError("");
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
    onFileChange(nextFile.name);
    setIsUploading(true);
    const formData = new FormData();
    formData.append("pdf", nextFile);

    try {
      const response = await fetch("http://localhost:3000/upload/pdf", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed. Please try again.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
      onFileChange(null);
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setError("");
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) void selectFile(droppedFile);
  };

  return (
    <aside className="document-panel">
      <div className="workspace-brand">
        <a className="brand-mark" href="#top"><img className="workspace-brand-logo" src="/logo.png" alt="" />WhisperPDF</a>
        <SignOutButton>
          <button className="quiet-button" type="button">Sign out</button>
        </SignOutButton>
      </div>

      <div className="document-heading">
        <span className="eyebrow">YOUR WORKSPACE</span>
        <h2>Your document</h2>
        <p>Bring a PDF into focus, then ask it anything.</p>
      </div>

      {file && previewUrl ? (
        <section className="pdf-card" aria-label="PDF preview">
          <div className="pdf-card-header">
            <div className="file-identity">
              <span className="file-icon"><FileText size={18} /></span>
              <div className="file-name-wrap">
                <strong title={file.name}>{file.name}</strong>
                <span>{isUploading ? "Uploading and preparing…" : `${(file.size / 1024 / 1024).toFixed(2)} MB · PDF`}</span>
              </div>
            </div>
            <button className="icon-button" type="button" onClick={clearFile} aria-label="Remove selected PDF" title="Remove PDF"><X size={18} /></button>
          </div>
          <div className="pdf-preview">
            <iframe src={`${previewUrl}#toolbar=0&navpanes=0`} title={`Preview of ${file.name}`} />
            {isUploading && <div className="preview-loading"><LoaderCircle className="spin" size={20} /> Preparing your document</div>}
          </div>
          <div className="pdf-card-footer"><span className="status-dot" />{isUploading ? "Getting things ready" : "Ready to explore"}</div>
        </section>
      ) : (
        <div
          className={`upload-dropzone ${isDragOver ? "is-dragging" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}
        >
          <span className="upload-icon"><FileUp size={24} /></span>
          <strong>Drop your PDF here</strong>
          <span>or <span className="text-link">browse files</span></span>
          <small>PDF documents · ready when you are</small>
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(event) => {
            const chosen = event.target.files?.[0];
            if (chosen) void selectFile(chosen);
          }} />
        </div>
      )}

      {error && <p className="upload-error" role="alert">{error}</p>}
      <div className="privacy-note"><span className="privacy-lock"></span></div>
    </aside>
  );
};

export default FileUpload;
