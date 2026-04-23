import dotenv from "dotenv";
import pg from "pg";

const { Pool } = pg;

dotenv.config();

const routePool = new Pool({
    connectionString: process.env.ROUTE_DATABASE_URL || process.env.DATABASE_URL,
    ssl: process.env.ROUTE_DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : process.env.DATABASE_SSL === "true"
            ? { rejectUnauthorized: false }
            : false,
});

export default routePool;
