import express from "express";
const app = express();
const port = 3001;

import cookieParser from "cookie-parser";
app.use(cookieParser());

//(1)
import { createAdminClient, createSessionClient } from "./appwrite.js";
import { OAuthProvider } from "node-appwrite";

app.get("/", (req, res) => {
    console.log("Hello");
    res.send("Google OAuth SSR Demo");
});

app.get("/auth", async (req, res) => {
    //(2) - Try catch
    try {
        //(3) - Set account instance and create rediect URL
        const { account } = await createAdminClient();
        const redirectUrl = await account.createOAuth2Token(
            OAuthProvider.Github,
            "http://localhost:3001/success",
            "http://localhost:3001/#fail"
        );
        //(5) - Let's open the redirect url right away
        const htmlContent = `<button><a href="${redirectUrl}">Sign in with Google</a></button>`;
        res.set("Content-Type", "text/html");
        res.send(htmlContent);
        // res.redirect(redirectUrl);
        //(4) - Let's view the url
        // res.json({ redirectUrl });
    } catch (error) {
        console.log("Error:", error);
        res.json({ ERROR: error });
    }
});

app.get("/success", async (req, res) => {
    try {
        const { userId, secret } = req.query;

        const { account } = await createAdminClient();
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
        console.log("sessionCookie:", sessionCookie);
        const { account } = await createSessionClient(sessionCookie);
        const user = await account.get();
        console.log(user.name);
        return res.json({ user });
    } catch (error) {
        return res.json({ ERROR: error });
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
