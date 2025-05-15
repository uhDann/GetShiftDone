const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors()); // Allow requests from any origin
app.use(express.json()); // Parse JSON body

let lastPayload = null;  // In-memory store

// POST endpoint: receive data
app.post("/data", (req, res) => {
  console.log("Received POST:", req.body);
  lastPayload = req.body;
  res.status(200).json({ message: "Data stored" });
});

// GET endpoint: return latest data
app.get("/data", (req, res) => {
  if (lastPayload) {
    res.status(200).json(lastPayload);
  } else {
    res.status(204).send();  // No content yet
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

