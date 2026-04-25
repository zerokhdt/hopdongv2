import admin from "firebase-admin";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();
const JWT_SECRET = process.env.VITE_FIREBASE_API_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ message: "Missing data" });
    }

    const snapshot = await db
      .collection("accounts")
      .where("username", "==", username)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(400).json({ message: "User not found" });
    }

    const doc = snapshot.docs[0];
    const user = doc.data();

    if (!user.active) {
      return res.status(403).json({ message: "Account disabled" });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(400).json({ message: "Wrong password" });
    }

    const token = jwt.sign(
      {
        id: doc.id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    await doc.ref.update({
      last_login: new Date(),
    });

    return res.status(200).json({
      message: "Login success",
      token,
      user: {
        id: doc.id,
        username: user.username,
        role: user.role,
        branch: user.branch,
      },
    });
  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
}