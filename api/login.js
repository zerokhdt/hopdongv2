import admin from "firebase-admin";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// 🔥 init firebase (tránh init nhiều lần)
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const JWT_SECRET = process.env.JWT_SECRET || "secret_key";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { username, password } = req.body;

    // 1. tìm user
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

    // 2. check active
    if (!user.active) {
      return res.status(403).json({ message: "Account disabled" });
    }

    // 3. check password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(400).json({ message: "Wrong password" });
    }

    // 4. tạo token
    const token = jwt.sign(
      {
        id: doc.id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    // 5. update last_login
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
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}