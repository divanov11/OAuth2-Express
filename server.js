import express from "express";
const app = express();
const port = 5173;

import cookieParser from "cookie-parser";
app.use(cookieParser());

import createAppwriteClient from "./appwrite.js";
import { OAuthProvider } from "node-appwrite";

app.get("/", (req, res) => {
    console.log("Hello");
    res.send("Google OAuth SSR Demo");
});

app.get("/auth", async (req, res) => {
    try {
        const { account } = await createAppwriteClient("admin");
        const redirectUrl = await account.createOAuth2Token(
            OAuthProvider.Github,
            "http://localhost:5173/success",
            "http://localhost:5173/#fail"
        );
        const htmlContent = `<button><a href="${redirectUrl}">Sign in with Google</a></button>`;
        res.set("Content-Type", "text/html");
        res.send(htmlContent);
    } catch (error) {
        console.log("Error:", error);
        res.json({ ERROR: error });
    }
});

app.get("/success", async (req, res) => {
    console.log("triggered success");
    try {
        const { userId, secret } = req.query;

        const { account } = await createAppwriteClient("admin");
        const session = await account.createSession(userId, secret);

        res.cookie("session", session.secret, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            expires: new Date(session.expire),
            path: "/",
        });
        return res.json({ message: "Session successfully set!" });
    } catch (error) {
        console.log("Error:", error);
        res.json({ ERROR: error });
    }
});

app.get("/user", async (req, res) => {
    try {
        const sessionCookie = req.cookies.session;
        const { account } = await createAppwriteClient(
            "session",
            sessionCookie
        );
        const user = await account.get();

        return res.json({ user });
    } catch (error) {
        return res.json({ ERROR: error });
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
