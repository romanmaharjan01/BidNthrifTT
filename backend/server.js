import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(cors()); // Enable CORS for cross-origin requests

let users = [
    { email: "user@example.com", password: "password123", resetToken: null },
];

// User Registration
app.post("/api/user/register", (req, res) => {
    const { email, password } = req.body;
    if (users.some(user => user.email === email)) {
        return res.status(400).json({ message: "User already exists" });
    }
    users.push({ email, password, resetToken: null });
    res.json({ message: "User registered successfully" });
});

// User Login
app.post("/api/user/login", (req, res) => {
    const { email, password } = req.body;
    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    res.json({ message: "Login successful" });
});

// Forgot Password - Generate Token
app.post("/api/user/forgot-password-token", (req, res) => {
    const { email } = req.body;
    const user = users.find((u) => u.email === email);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    // Generate a random reset token
    const resetToken = Math.random().toString(36).substring(2);
    user.resetToken = resetToken;
    console.log(`Reset Link: http://localhost:${PORT}/reset-password/${resetToken}`);
    return res.json({ message: "Reset email sent!", resetToken });
});

// Reset Password
app.put("/api/user/reset-password/:token", (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    const user = users.find((u) => u.resetToken === token);
    if (!user) {
        return res.status(400).json({ message: "Invalid token" });
    }
    user.password = password;
    user.resetToken = null; // Clear reset token
    res.json({ message: "Password reset successfully" });
});

// Start Server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
