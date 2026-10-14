import { Worker } from "bullmq";
import "dotenv/config";
import { unlink } from "node:fs/promises";
import { redisConnection } from "./redisConnection.js";
import { QdrantVectorStore } from "@langchain/qdrant";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Document } from "@langchain/core/documents";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const worker = new Worker(
  "file-upload-queue",
  async (job) => {
    // console.log("job", job.data);
    const data = job.data;
    try {
      const loader = new PDFLoader(data.path);
      const docs = await loader.load();

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 350,
    });

    const splitedDocs = await splitter.splitDocuments(docs);
    console.log("Chunked Docs", splitedDocs.length, "chunkes Created");

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY,
      model: "models/gemini-embedding-001",
    });

    const vectorStore = await QdrantVectorStore.fromDocuments(splitedDocs, embeddings, {
      url: process.env.QDRANT_URL || "http://localhost:6333",
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: "pdf-ChatBot",
      checkCompatibility: false,
    });

    console.log("All docs have been embedded & stored in Qdrant");
    } finally {
      await unlink(data.path).catch(() => {});
    }
  },

  {
    concurrency: 2,
    connection: redisConnection,
  },
);
