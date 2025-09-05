const express = require("express");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;
const USERS_FILE = "./users.json";

app.use(cors());
app.use(bodyParser.json());

// 👇 Serve frontend from /public
app.use(express.static(path.join(__dirname, "public")));

// Fallback: always send index.html for unknown routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- APIs ---
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return {};
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8") || "{}");
}
function saveUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });
  const users = loadUsers();
  if (users[username]) return res.status(400).json({ error: "User exists" });
  users[username] = { password, data: null };
  saveUsers(users);
  res.json({ success: true });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  if (!users[username] || users[username].password !== password) {
    return res.status(400).json({ error: "Invalid login" });
  }
  res.json({ success: true, data: users[username].data });
});

app.post("/save", (req, res) => {
  const { username, data } = req.body;
  const users = loadUsers();
  if (!users[username]) return res.status(400).json({ error: "No such user" });
  users[username].data = data;
  saveUsers(users);
  res.json({ success: true });
});

app.get("/load/:username", (req, res) => {
  const { username } = req.params;
  const users = loadUsers();
  if (!users[username]) return res.status(400).json({ error: "No such user" });
  res.json({ data: users[username].data });
});

app.listen(PORT, () => console.log(`Studier running at http://localhost:${PORT}`));
