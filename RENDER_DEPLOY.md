# Render deployment

The API and BullMQ worker run in one Render Web Service so the worker can read the PDF from the same service filesystem while processing it. Redis-compatible Key Value handles the queue and Qdrant stores embeddings.

## Create the external services

1. Create a Render **Key Value** instance. Copy its internal Redis URL for `REDIS_URL` (use the internal URL when available).
2. Create a Qdrant Cloud cluster. Copy its HTTPS endpoint and API key for `QDRANT_URL` and `QDRANT_API_KEY`.
3. Create a Gemini API key. In Clerk, use the production publishable key and be ready to add the deployed site URL to Clerk's allowed origins.

## Deploy the API and worker

1. Push the repository to GitHub and connect it in Render.
2. Create a **Web Service** with root directory `Server`, build command `npm ci`, and start command `npm start`. Choose the Free plan.
3. Set these environment variables on the service: `GEMINI_API_KEY`, `GEMINI_MODEL`, `QDRANT_URL`, `QDRANT_API_KEY`, `REDIS_URL`, and `FRONTEND_URL`. Render supplies `PORT` automatically.
4. Deploy, then check `https://<api-service>.onrender.com/health`. Copy the API base URL.

## Deploy the frontend

1. Create a **Static Site** from the same repo, with root directory `Client`, build command `npm ci && npm run build`, and publish directory `dist`.
2. Set `VITE_API_URL` to the API base URL and `VITE_CLERK_PUBLISHABLE_KEY` to the Clerk production publishable key.
3. Deploy and copy the frontend URL. Set that URL as the API's `FRONTEND_URL`, save, and redeploy the API.
4. Add the frontend URL to Clerk's allowed origins/redirect settings.
5. Upload a PDF and wait for the worker logs to report that embeddings were stored before chatting with the document.

The Render Free web service sleeps after 15 minutes without traffic, and its local filesystem is temporary. The PDF is only needed while its queue job is being processed; a restart before processing completes can lose that upload. Once embeddings are stored, Qdrant holds the searchable content. Review the free-service limits for Render Key Value, Qdrant, and Gemini separately. [Render free plans](https://render.com/docs/free)
