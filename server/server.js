const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

const app = express();
const publicDir = path.join(__dirname, "..", "public");
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(express.static(publicDir));

const SECRET = "geheim123";

// Fake Datenbank
let users = [];

/* REGISTER */
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  users.push({
    email,
    password: hashedPassword
  });

  res.json({ message: "User erstellt" });
});

/* LOGIN */
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(401).json({ message: "User nicht gefunden" });
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.status(401).json({ message: "Falsches Passwort" });
  }

  const token = jwt.sign({ email }, SECRET, { expiresIn: "2h" });

  res.json({ token });
});

app.post("/send-report-email", async (req, res) => {
  const {
    to,
    subject,
    text,
    pdfBase64,
    fileName
  } = req.body || {};

  if (!to || !subject || !pdfBase64) {
    return res.status(400).json({
      message: "Empfaenger, Betreff und PDF fehlen."
    });
  }

  if (
    !process.env.RESEND_API_KEY ||
    !process.env.REPORT_FROM_EMAIL
  ) {
    return res.status(503).json({
      message: "E-Mail-Versand ist noch nicht konfiguriert."
    });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.RESEND_API_KEY
      },
      body: JSON.stringify({
        from: process.env.REPORT_FROM_EMAIL,
        to: [to],
        subject,
        text: text || "Im Anhang befindet sich Ihr Stundennachweis.",
        attachments: [{
          filename: fileName || "stundennachweis.pdf",
          content: pdfBase64
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        message: data.message || "E-Mail konnte nicht versendet werden.",
        details: data
      });
    }

    res.json({
      message: "E-Mail versendet",
      data
    });
  } catch (error) {
    res.status(500).json({
      message: "E-Mail konnte nicht versendet werden.",
      details: String(error)
    });
  }
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  console.log("Baudoku laeuft auf Port " + PORT);
});
