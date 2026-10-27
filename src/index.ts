import dotenv from "dotenv";
import express from "express";

import { server } from "./utils/Storage";
import {
  databaseConnectionSetup,
  serverSetup,
} from "./utils/Functions";

dotenv.config({ encoding: "utf-8" });

if (!process.env.NODE_ENV) {
  console.log("You must provide the NODE_ENV in .env");
  process.exit(0);
}
if (!(
  process.env.NODE_ENV === "production" ||
  process.env.NODE_ENV === "development"
)) {
  console.log('NODE_ENV must be either \"production\" or \"development\"');
  process.exit(0);
}

process.on("uncaughtException", (error: Error) => console.log(error));
process.on("unhandledRejection", (error: Error) => console.log(error));

databaseConnectionSetup();

server.app = express();
serverSetup();
