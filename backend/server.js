const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");
const storefrontRoutes = require("./routes/storefront.routes");

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "Oven2Door API is running." });
});

app.use("/api", authRoutes);
app.use("/api", storefrontRoutes);

app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on http://0.0.0.0:3000");
});
