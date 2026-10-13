import { ArrowDown, ArrowUp, FileText } from "lucide-react";
import * as React from "react";

interface Doc {
  pageContent?: string;
  metadata?: { loc?: { pageNumber?: number }; source?: string };
}
interface Message {
  role: "assistant" | "user";
  content?: string;
  docs?: Doc[];
}

const ChatPage: React.FC<{ fileName: string | null }> = ({ fileName }) => {
  const [message, setMessage] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const feedRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    feedRef.current?.scrollTo({
      top: feedRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  const sendMessage = async (question = message) => {
    if (!question.trim() || isLoading) return;
    setMessages((previous) => [
      ...previous,
      { role: "user", content: question.trim() },
    ]);
    setMessage("");
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3000/chat?message=${encodeURIComponent(question.trim())}`,
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "Could not get an answer. Please try again.",
        );
      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: data.message, docs: data.docs },
      ]);
    } catch (chatError) {
      setError(
        chatError instanceof Error
          ? chatError.message
          : "Could not connect to WhisperPDF.",
      );
    } finally {
      setIsLoading(false);
    }
  };

 

  return (
    <section className="chat-panel">
      <header className="chat-header">
        <div>
          <span className="eyebrow">DOCUMENT ASSISTANT</span>
          <h1>Let’s make sense of it.</h1>
        </div>
        {fileName ? (
          <div className="active-document">
            <FileText size={15} />
            <span title={fileName}>{fileName}</span>
          </div>
        ) : (
          <span className="waiting-pill">Waiting for a PDF</span>
        )}
      </header>

      <div className="chat-feed" ref={feedRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">
            <span className="eyebrow">A CLEARER WAY THROUGH</span>
            <h2>
              {fileName
                ? "Your PDF, in conversation."
                : "Start with a document."}
            </h2>
            <p>
              {fileName
                ? "Ask a question, find a detail, or get the big picture. Answers come with source pages."
                : "Upload a PDF on the left and we’ll help you find the useful bits."}
            </p>
  
          </div>
        ) : (
          messages.map((item, index) => (
            <article className={`message-row ${item.role}`} key={index}>
              <div className="message-content">
                <div className="message-bubble">{item.content}</div>
                {item.role === "assistant" &&
                  item.docs &&
                  item.docs.length > 0 && (
                    <div className="sources-block">
                      <span className="source-label">
                        GROUNDED IN YOUR PDF · {item.docs.length} SOURCES
                      </span>
                      {item.docs.slice(0, 3).map((doc, sourceIndex) => (
                        <div className="source-card" key={sourceIndex}>
                          {doc.metadata?.loc?.pageNumber && (
                            <span className="page-chip">
                              Page {doc.metadata.loc.pageNumber}
                            </span>
                          )}
                          {doc.pageContent && (
                            <p>
                              {doc.pageContent.length > 260
                                ? `${doc.pageContent.slice(0, 260)}…`
                                : doc.pageContent}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </article>
          ))
        )}
        {isLoading && (
          <div className="message-row assistant">
            <div className="message-bubble thinking">
              <i />
              <i />
              <i /> Reading between the lines…
            </div>
          </div>
        )}
      </div>

      <div className="composer-wrap">
        {error && (
          <p className="chat-error" role="alert">
            {error}
          </p>
        )}
        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage();
          }}
        >
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={
              fileName
                ? "Ask anything about your document…"
                : "Upload a PDF to begin a conversation…"
            }
            rows={1}
            disabled={!fileName || isLoading}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
          />
          <button
            className="send-button"
            type="submit"
            disabled={!fileName || !message.trim() || isLoading}
            aria-label="Send message"
          >
            <ArrowUp size={19} />
          </button>
        </form>
        <p className="composer-hint">
          WhisperPDF can make mistakes. Check important details against your
          source.
        </p>
      </div>
    </section>
  );
};

export default ChatPage;
