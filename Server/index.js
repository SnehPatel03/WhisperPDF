import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { Queue } from "bullmq";
import { QdrantVectorStore } from "@langchain/qdrant";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const queue = new Queue("file-upload-queue", {
  connection: {
    host: "localhost",
    port: 6379,
  },
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "upload/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage });

app.post("/upload/pdf", upload.single("pdf"), async (req, res) => {
  try {
    await queue.add(
      "file-ready",
      JSON.stringify({
        filename: req.file.originalname,
        destination: req.file.destination,
        path: req.file.path,
      })
    );

    res.json({
      success: true,
      file: req.file,
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
        url: "http://localhost:6333",
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


app.listen(3000, () => {
  console.log("Server is Listening on PORT : 3000");
});