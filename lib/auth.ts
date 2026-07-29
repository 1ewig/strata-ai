import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    options: "-c search_path=better_auth,public",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
});
