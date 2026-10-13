import * as React from "react";
import ChatPage from "../components/ChatPage";
import FileUpload from "../components/FileUpload";

export default function MainPage() {
  const [fileName, setFileName] = React.useState<string | null>(null);
  return (
    <main className="workspace-shell">
      <FileUpload onFileChange={setFileName} />
      <ChatPage fileName={fileName} />
    </main>
  );
}
