import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import yields from "./routes/yields";
import optimize from "./routes/optimize";
import testGluex from "./routes/test-gluex";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/yields", yields);
app.use("/optimize", optimize);
app.use("/test-gluex", testGluex);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Test GlueX API at: http://localhost:${PORT}/test-gluex/test`);
});
