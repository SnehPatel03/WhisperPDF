import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { Queue } from "bullmq";
import { QdrantVectorStore } from "@langchain/qdrant";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { mkdir } from "node:fs/promises";
import { redisConnection } from "./redisConnection.js";
import "./Worker.js";

dotenv.config();

await mkdir("upload", { recursive: true });

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const queue = new Queue("file-upload-queue", {
  connection: redisConnection,
});

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, "upload/"),
  filename: (_req, file, callback) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${uniqueSuffix}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.post("/upload/pdf", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "A PDF file is required." });
    await queue.add(
      "file-ready",
      {
        filename: req.file.originalname,
        destination: req.file.destination,
        path: req.file.path,
      },
    );

    res.json({
      success: true,
      fileName: req.file.originalname,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.get("/chat", async (req, res) => {
  try {
    const userQuery = req.query.message;

    if (!userQuery) {
      return res.status(400).json({
        error: "message query param required",
      });
    }

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY,
      model: "models/gemini-embedding-001",
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: process.env.QDRANT_URL || "http://localhost:6333",
        apiKey: process.env.QDRANT_API_KEY,
        collectionName: "pdf-ChatBot",
        checkCompatibility: false,
      }
    );

    const retriever = vectorStore.asRetriever({
      k: 2,
    });

    const docs = await retriever.invoke(userQuery);

    const SYSTEM_PROMPT = `
You are a helpful AI assistant who answers user queries
based on the context from the PDF file.

Context:
${docs.map((d) => d.pageContent).join("\n")}
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
    });

    const result = await model.generateContent([
      SYSTEM_PROMPT,
      `User Question: ${userQuery}`,
    ]);

    return res.json({
      message: result.response.text(),
      docs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Chat failed",
    });
  }
});


app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log(`Server is listening on port ${process.env.PORT || 3000}`);
});
