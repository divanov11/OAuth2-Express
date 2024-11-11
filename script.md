**Table of contents**

-   [Introduction](#Intro)
-   [Outline](#Outline)
-   [Prerequisits](#Prerequisits)
-   [Initial setup](#Initial-setup)
-   [First Routes](#First-Routes)
-   [OAuth Routes](#OAuth-Routes)
-   [Appwrite client](#Appwrite-client)
-   [Generating OAuth URL](#Generating-OAuth-URL)
-   [Creating Sessions](#Creating-Sessions)

### Intro

Hey everybody in this video we're gonna take a look at how you can handle OAuth on the server side with Appwrite. Now I've made several videos already where I did Sign in with google, sign in with Github and even sign in with Apple, but All of these have been done on the client side with Appwrites web SDK.

The process is somewhat simular if you want to do this on the server side with some slight differences, so we'll take a look at how this can now be done on the server side. I'll make some follow up videos doing this with tools like Next JS later, however in this one I want to focus on the core concepts so I'm gonna use Node js with express to demonstrate all of this.

### Outline

So in this video we'll create a simple express app with 4 routes.

-   1 that is a standard route anybody can access
-   Another that is protected for authenticated users, which retrives the currently logged in user
-   And the other two will be routes that initiate the OAuth process and set a session cookie once a user is authenticated.

### Prerequisits

Now we're gonna set up our express app from scratch here, but I we will not cover setting up our appwrite backend or configuring our google account. If you want to see how to do that, I already did this in a previous video, so I'll link that up. The google config process is only about 2:30 so just watch that and come back to this video.

### Initial setup

Alright so let's get right to it and setup a new express application.

First I'll create folder for my project:

`mkdir nodejs_oauth`

From our folder we'll run npm init to create our package.json file, and we'll set our entry point as `server.js`. The rest of the commands we'll just click enter through to use all the defaults.

I want to use the import statement in my project so I'll configure my package.json file to use ES modules by adding in `"type": "module"` in package.json.

Next let's install some depenecies we'll need before we setup our server.

I'll import express, node-appwrite, dotenv, nodemon and cookie-parser.

```
npm i express node-appwrite dotenv nodemon cookie-parser
```

Lets create a server.js file.

and in this file I'll make some imports and initiate an express app.

In my google configuration email I used port 5173 so I'll stick to the same port here so you don't get confused.

Let's go call app.listen to start listening to request comming from port 5173.

```js
import express from "express";
const app = express();
const port = 5173;

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
```

### First Routes

Now let's create our first route, which will be the root route users go to and this will be unprotected so anybody can open this, so we'll just return some hello world message.

```js
app.get("/", (req, res) => {
    res.send("Google OAuth SSR Demo");
});
```

Let's go ahead and start our server and see what we have. All looks good so let's move on.

```
nodemon server.js
```

The next route we'll be our user route for when we are logged in. This route will check for a session cookie before proceeding, if we have one, we can continue, if not we'll tell the user they are not allowed on this page.

```JS
app.get("/user", async (req, res) => {
    try {
        const sessionCookie = req.cookies.session;

        if (!sessionCookie) {
            return res.send("You are not authenticated, go log in!");
        }
        return res.json({ sessionCookie });
    } catch (error) {
        return res.json({ ERROR: error });
    }
});
```

Now in order to retrieve this cookie like this we'll need to import cookie-parser and configure it so let's do that at the top of our server.js file.

```js
import cookieParser from "cookie-parser";
app.use(cookieParser());
```

Let's test this route out. Here we are blocked from viewing anything, But if I go in and manualy set the cookie, I can proceed to view it as a logged in user. Later we'll use the session cookie we generate to return our actuall user but until we do that let's leave it like this.

### OAuth Routes

There are still two more routes that we need to add in here. One will be a route to start the authentication process with our OAuth provider, and the other will be a route that creates a session and sets a cookie once we have logged in with our provider.

We'll call theses routes `/auth` and `/success`. Before we add any functionality I'll need to first initate my appwrite client so we'll do that first.

```js
app.get("/auth", async (req, res) => {
    try {
        return res.send("/auth");
    } catch (error) {
        console.log("Error:", error);
        res.json({ ERROR: error });
    }
});

app.get("/success", async (req, res) => {
    try {
        return res.json({ message: "Session successfully set!" });
    } catch (error) {
        console.log("Error:", error);
        res.json({ ERROR: error });
    }
});
```

### Appwrite client

As I mentioned before I already have an appwrite project ready to go. I'm gonna get some credentials from my project and set them in this `.env` file. If you don't have one simply go to appwrite.io and create a new project. In your console you'll need to get your project id, so let's copy this and paste it over into the `.env` file. We'll also need to generate a API key with auth permissions set, so let's go ahead and create that under the intergratuons section, and just for demo purposes I'll select all scopes for this key. Now let's just add that into our env file and set a endpoint as well.

```
ENDPOINT=https://cloud.appwrite.io/v1
API_KEY=<YOUR_API_KEY>
PROJECT_ID=<YOUR_PROJECT_ID>
```

With our environment variables set we can now create an `appwrite.js` file and in here we'll create a function to use throughout our application that lets us initiate an appwrite client.

Let's first make some imports from our `node-appwrite` server sdk and dotenv so we can access the environment variables we just set.

Now the `createAppwriteClient` function will be responsible for creating two differet tupes of clients. One will be a client for admin requests such as creating a session and logging in users before we have one, and another will be for performing authenticated requests which rely on the session we generate.

So think of it this way:

-   Admin client: Before we login
-   Session client: After we login

The session client is set with a session while the admin client relies on the API key and the permissions we give it.

Remember we are using the server SDK with `node-appwrite`, this is different from the client web sdk I've used in previous videos on this channel

```js
import { Client, Databases, Account } from "node-appwrite";
import dotenv from "dotenv";
dotenv.config();

const createAppwriteClient = async (type, session) => {
    const { ENDPOINT, PROJECT_ID, API_KEY } = process.env;
    const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);

    if (type === "admin") {
        client.setKey(API_KEY);
    }

    if (type === "session" && session) {
        client.setSession(session);
    }

    return {
        get account() {
            return new Account(client);
        },
        get databases() {
            return new Databases(client);
        },
    };
};

export default createAppwriteClient;
```

### Generating OAuth URL

Let's go ahead and import the createAppwriteClient function into server.js so we can begin using it, as well as the OAuthProvider enum, which just allows us to specify the provider we want to use.

```js
import createAppwriteClient from "./appwrite.js";
import { OAuthProvider } from "node-appwrite";
```

Server-side OAuth2 authentication requires two server endpoints, so we'll start with the first which initates the login process.

We'll first need to access our `account` with the `createAppwriteClient` function, and then we'll call the `createOAuth2Token` method.

```js
const { account } = await createAppwriteClient("admin");

const redirectUrl = await account.createOAuth2Token(
    OAuthProvider.Github,
    "http://localhost:5173/success",
    "http://localhost:5173/#fail"
);
return res.json({ redirectUrl });
```

This method will generate a URL for us which sends us to login with our OAuth provider.

Let's go ahead and pass in our provider (google) and a sucess url and fail url. The success URL is where we will be sent to once we are authenticated with our OAuth provider.

I'll turn this url into a button in a second but let's first try returning this URL in a JSON response so you can see it.

If I manually copy this over and paste it in my browser you see it takes me to my login screen. If I login, I am sent back to the `/success` endpoint with `userId` and a `secret` in the url parameters as you can see here.

We'll use this userId and scret to generate a session and set the session in our browsers cookies in the next step, but first, let's turn this route into a button so we can just click it.

So I'll just quickly write my html in a string, add in the redirect URL in the link and, set the content type to text/html and call res.send.

```js
const button = `<button><a href="${redirectUrl}">Sign in with Google</a></button>`;
res.set("Content-Type", "text/html");
res.send(button);
```

Now if we go to `/auth` we'll see this button which we can click on.

For demo purposes I am gonna be using incognito mode so I can make sure I have a fresh session each time I start this process.

### Creating Sessions

So we are able to login with our OAuth provider, but we are not acutally logged in until we can actually create a session and set some sort of state. Until we do this we will need to login on each request so let's finalize this in the success route.

In the success route we'll first get our `userId` and `secret` from the query parameters that our provider added to the url.

Then we'll set an account instance with `createAdminClient` and call the `createSession` method with our `userId` and `secret`. This method will return a session secret which we can store in our cookies, which will allow use to hold this authenticated state for our user.

To set our cookies we'll call `res.cookie`, set the key as `session` and pass in the actuall session secret.

For our cookies settings we'll set httpOnly to true, secure will also be true, sameSite will be strict, and we'll use the session expire time to set expires attribute and path will be our root url.

```js
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
```

Lets finish this up by getting our user in the `/user` route.

Here we'll create a session client and pass in the session itself. This will now create a session for the user you just logged in with, which means you should now be able to retrive the user with `account.get`. So let's return this user and try this out.

```js
app.get("/user", async (req, res) => {
    try {
        const sessionCookie = req.cookies.session;

        if (!sessionCookie) {
            return res.send("You are not authenticated, go log in!");
        }
        const { account } = await createAppwriteClient(
            "session",
            sessionCookie
        );
        const user = await account.get();
        return res.json({ user });
        // return res.json({ sessionCookie });
    } catch (error) {
        return res.json({ ERROR: error });
    }
});
```

No If I complete the login process, I should be able to see my user in the response as this javascript object.

I can always manually delete this session from my cookies and restart this process. Which means we'll see this message again when going to the `/user` route
