import { Client, Databases, Account } from "node-appwrite";
import dotenv from "dotenv";
dotenv.config();

const createAdminClient = async () => {
    const client = new Client()
        .setEndpoint(process.env.ENDPOINT)
        .setProject(process.env.PROJECT_ID)
        .setKey(process.env.API_KEY);

    return {
        get account() {
            return new Account(client);
        },

        get databases() {
            return new Databases(client);
        },
    };
};

const createSessionClient = async (session) => {
    const client = new Client()
        .setEndpoint(process.env.ENDPOINT)
        .setProject(process.env.PROJECT_ID);

    if (session) {
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

export { createAdminClient, createSessionClient };
