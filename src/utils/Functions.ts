// External libs
import fs from "fs";
import path from "path";
import http from "http";
import https from "https";
import crypto from "crypto";
import mysql, {
  RowDataPacket,
  PoolConnection,
} from "express-mysql-session/node_modules/mysql2";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

// Routes
import root from "../routes/root";
import views from "../routes/views";
import home from "../routes/home";

// Internal libs
import {
  User,
} from "./Structures";
import { server, config } from "./Storage";

/**
 * Checks if a string is a positive integer
 * @function
 * @param text The string to be checked
 * @returns {boolean} Whether `text` is a positive integer
 */
export function isInteger(text: any): text is number {
  if (typeof text === "string" && text.length === 0) return false;

  return /^[1-9]\d*$/.test(text);
}

/**
 * Checks if a value is invalid (`null` or `undefined`)
 * @function
 * @param value The value
 * @returns {boolean} Whether the value is invalid or not
 */
export function isInvalid(value: any): value is null | undefined {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.length === 0)
  );
}

/**
 * Reduces a filename to its base component and rejects anything unsafe
 * @function
 * @param originalName The raw filename
 * @returns {string | null} the sanitized filename, or null if it can't be made safe
 */
export function sanitizeFilename(originalName: string): string | null {
  const base: string = path.basename(originalName).trim();
  if (!base || base === "." || base === "..") return null;

  return base;
}

/**
 * Resolves `parts` under `base` and guarantees the result stays inside `base`
 * @function
 * @param base The path base
 * @param parts An array of path parts
 * @returns {string | null} the resolved path, or null if it would escape `base`
 */
export function safeJoin(base: string, ...parts: string[]): string | null {
  const baseResolved: string = path.resolve(base);
  const target: string = path.resolve(baseResolved, ...parts);
  if (target !== baseResolved && !target.startsWith(baseResolved + path.sep))
    return null;

  return target;
}

/**
 * Checks if the provided username is valid
 * @function
 * @param username The username string
 * @returns {boolean} Whether or not the username is a string and valid
 */
export function isValidUsername(username: unknown): username is string {
  return typeof username === "string" && /^[a-zA-Z0-9_-]{3,32}$/.test(username);
}

export function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getUser(
  userObj: RowDataPacket,
  includePassword?: boolean,
): User | undefined {
  if (
    userObj.user_id !== undefined &&
    userObj.username !== undefined &&
    userObj.email !== undefined &&
    userObj.password !== undefined &&
    userObj.creation_date !== undefined &&
    userObj.last_active !== undefined &&
    userObj.admin !== undefined &&
    typeof userObj.user_id === "number" &&
    typeof userObj.username === "string" &&
    typeof userObj.email === "string" &&
    typeof userObj.password === "string" &&
    typeof userObj.creation_date === "object" &&
    typeof userObj.last_active === "object" &&
    typeof userObj.admin === "number" &&
    (userObj.admin === 1 || userObj.admin === 0)
  )
    return {
      user_id: userObj.user_id,
      username: userObj.username,
      email: userObj.email,
      ...(includePassword ? { password: userObj.password } : {}),
      display_name: userObj.display_name,
      bio: userObj.bio,
      avatar_url: userObj.avatar_url,
      creation_date: userObj.creation_date,
      last_active: userObj.last_active,
      admin: userObj.admin === 1,
    };

  return undefined;
}

export function hashPassword(rawPassword: string, salt?: string): string {
  const usedSalt: string =
    salt !== undefined && salt.length > 0
      ? salt
      : crypto.randomBytes(32).toString("hex");

  return `${crypto.pbkdf2Sync(rawPassword, usedSalt, 1000, 64, "sha512").toString("hex")}/${usedSalt}`;
}

/**
 * Setups the database connection
 * @function
 * @returns {void}
 */
export function databaseConnectionSetup(): void {
  try {
    if (
      process.env.DB_HOST &&
      process.env.DB_PORT &&
      process.env.DB_USER &&
      process.env.DB_PASSWORD &&
      process.env.DB_DATABASE &&
      process.env.DB_CONNECTION_LIMIT &&
      process.env.DB_MAX_IDLE &&
      process.env.DB_IDLE_TIMEOUT &&
      process.env.DB_KEEP_ALIVE
    ) {
      server.database = mysql.createPool({
        host: process.env.DB_HOST,
        port: Number.parseInt(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        waitForConnections: true,
        connectionLimit: Number.parseInt(process.env.DB_CONNECTION_LIMIT),
        maxIdle: Number.parseInt(process.env.DB_MAX_IDLE),
        idleTimeout: Number.parseInt(process.env.DB_IDLE_TIMEOUT),
        queueLimit: 0,
        enableKeepAlive:
          process.env.DB_KEEP_ALIVE.toLowerCase() === "true" ||
          process.env.DB_KEEP_ALIVE === "1",
      });

      server.database.getConnection(
        (err: NodeJS.ErrnoException | null, connection: PoolConnection) => {
          if (server.database) {
            if (err) {
              console.log("Failed to connect to the database", err);
              process.exit(0);
            }

            connection.execute(
              "CREATE TABLE IF NOT EXISTS `users` (`user_id` INT NOT NULL AUTO_INCREMENT , `username` VARCHAR(255) NOT NULL , `email` VARCHAR(255) NOT NULL , `password` VARCHAR(255) NOT NULL , `display_name` VARCHAR(255) NULL DEFAULT NULL , `bio` TEXT NULL DEFAULT NULL , `avatar_url` VARCHAR(255) NULL DEFAULT NULL , `creation_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP , `last_active` TIMESTAMP DEFAULT CURRENT_TIMESTAMP , `admin` BOOLEAN NOT NULL DEFAULT FALSE , PRIMARY KEY (`user_id`) , UNIQUE `USERNAME` (`username`) , UNIQUE `EMAIL` (`email`))",
            );
          }
        },
      );

      console.log("Connected to the database");
    } else if (config.config.databaseRequired) throw "Invalid database configuration";
  } catch (err) {
    console.log("Failed to connect to the database", err);
    process.exit(0);
  }
}

/**
 * Checks if the application is running in the `development` mode
 * @function
 * @returns {boolean} Whether the application is running in `development` mode
 */
export function isInDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Gets the HTTP protocol based on the presence of a TLS certificate
 * @function
 * @returns {'http' | 'https'} The URL protocol
 */
export function getURLProtocol(): "http" | "https" {
  return process.env.TLS_CERT && process.env.TLS_KEY ? "https" : "http";
}

/**
 * Gets the port in the URL syntax
 *
 * Returns `''` if the port is either `80` or `443` and `keepPort` is not provided, `undefined` or `false`, as modern browsers omit the port if it is one of those two
 * @function
 * @param port The port
 * @param keepPort Whether to return the `port` with a leading `:`, even if `80` or `443`
 * @returns {'' | `:${number}`} The port in URL syntax (`:port`) or `''`, if `80` or '443' and `keepPort` is not provided, `undefined` or `false`
 */
export function getURLPort(
  port: number,
  keepPort?: boolean,
): "" | `:${number}` {
  if (Number.isInteger(port))
    return (port === 80 || port === 443) && !keepPort ? "" : `:${port}`;
  else throw new Error("Invalid port number");
}

/**
 * Constructs the stock URL, based on what URI components are provided
 * @function
 * @param parts URI components
 * @returns {string} The URL
 */
export function getURL(...parts: (string | null | undefined)[]): string {
  let url: string = `${getURLProtocol()}://${config.config.server.domain}${getURLPort(config.config.server.port)}`;

  parts
    .filter(
      (part: string | null | undefined) => part !== null && part !== undefined,
    )
    .forEach((part: string) => (url += `/${part}`));

  return url;
}

/**
 * Setups the server and the Express routes
 * @function
 * @returns {void}
 */
export function serverSetup(): void {
  if (server.app)
    try {
      server.app.disable("x-powered-by");
      server.app.set("view engine", "ejs");
      server.app.set("views", path.resolve(`./views`));

      server.app.use(express.urlencoded({ extended: true }));

      if (isInDevelopment())
        server.app.use((req: Request, _res: Response, next: NextFunction) => {
          console.log(
            `\n${new Date(Date.now()).toString()}:\nIP: ${req.ip}\nURL: ${req.originalUrl}\nMethod: ${req.method}\nRequest headers:\n  ${req.rawHeaders
              .map((value: string, index: number) =>
                index % 2 === 0 ? `\n  ${value.trim()}` : `: ${value.trim()}`,
              )
              .join("")
              .trim()}\nRequest body: ${req.body}`,
          );
          next();
        });

      if (!server.database && config.config.databaseRequired)
        throw new Error("The database connection pool is invalid");

      const isHttps: boolean = getURLProtocol() === "https";

      server.app.use(
        cors(),
        helmet({
          contentSecurityPolicy: {
            useDefaults: false,
            reportOnly: false,
            directives: {
              "default-src": ["'self'"],
              "base-uri": ["'self'"],
              "font-src": ["'self'", "https:", "data:"],
              "form-action": ["'self'"],
              "frame-ancestors": ["*"],
              "img-src": ["'self'", "https:", "data:"],
              "media-src": ["'self'", "https:", "data:"],
              "object-src": ["'none'"],
              "script-src": ["'self'", "'unsafe-inline'"],
              "script-src-attr": ["'none'"],
              "style-src": ["'self'", "https:", "'unsafe-inline'"],
              ...(isHttps ? { "upgrade-insecure-requests": [] } : {}),
            },
          },
          crossOriginEmbedderPolicy: { policy: "credentialless" },
          crossOriginOpenerPolicy: isHttps ? { policy: "same-origin" } : false,
          crossOriginResourcePolicy: { policy: "cross-origin" },
          dnsPrefetchControl: { allow: false },
          frameguard: false,
          hidePoweredBy: true,
          hsts: isHttps,
          ieNoOpen: true,
          noSniff: true,
          originAgentCluster: false,
          permittedCrossDomainPolicies: { permittedPolicies: "none" },
          referrerPolicy: { policy: "no-referrer" },
          xssFilter: false,
        }),
        (_req: Request, res: Response, next: NextFunction) => {
          res.set("Origin-Agent-Cluster", getURL());
          res.set("Cache-Control", "public, max-age=31536000, immutable");
          res.set("Expires", new Date(Date.now() + 31536000000).toUTCString());

          next();
        },
        compression(),
        (req: Request, res: Response, next: NextFunction) => {
          const isHostValid: boolean = req.headers.host
            ? req.headers.host === config.config.server.domain ||
            req.headers.host ===
            `${config.config.server.domain}${getURLPort(config.config.server.port, true)}`
            : false;

          if (!isHostValid) {
            res.status(404).end();
            if (isInDevelopment()) console.log(`${req.ip} redirected`);
          } else next();
        },
        (req: Request, res: Response, next: NextFunction) => {
          attachAbortHandling(req, res);
          next();
        },
        root,
        views,
        home,
        (_req: Request, res: Response, _next: NextFunction) => {
          res.status(404).end();
        },
      );

      if (process.env.TLS_KEY && process.env.TLS_CERT)
        server.server = https.createServer(
          {
            key: fs.readFileSync(path.resolve(process.env.TLS_KEY)),
            cert: fs.readFileSync(path.resolve(process.env.TLS_CERT)),
          },
          server.app,
        );
      else server.server = http.createServer(server.app);

      server.server.timeout = config.config.server.socketTimeout;
      server.server.keepAliveTimeout = config.config.server.keepAliveTimeout;
      server.server.requestTimeout = config.config.server.requestTimeout;
      server.server.headersTimeout = config.config.server.headersTimeout;

      server.server.listen(config.config.server.port, () => {
        console.log(
          `Listening on port ${config.config.server.port} ${isHttps ? "(HTTPS)" : "(HTTP)"}`,
        );
      });
    } catch (err) {
      console.log(err);
      process.exit(7);
    }
  else {
    console.log("Express app not initialized");
    process.exit(0);
  }
}

/**
 * Ends a response with `status`, but only if the connection is still writable
 * @function
 * @param res The response object
 * @param status The status with which `res` can be ended.
 * @returns {void}
 */
export function safeError(res: Response, status: number): void {
  if (res.headersSent || res.writableEnded || res.destroyed) return;

  try {
    res.status(status).end();
  } catch (err) {
    if (isInDevelopment()) console.log(err);
  }
}

export function attachAbortHandling(req: Request, res: Response): void {
  const isBenignAbort = (code?: string): boolean =>
    code === "ECONNRESET" ||
    code === "EPIPE" ||
    code === "ECONNABORTED" ||
    code === "ERR_STREAM_PREMATURE_CLOSE";

  const handle = (err: NodeJS.ErrnoException) => {
    if (isInDevelopment() && !isBenignAbort(err.code)) console.log(err);
    safeError(res, 500);
  };

  req.on("error", handle);
  res.on("error", handle);

  req.socket.on("error", (err: NodeJS.ErrnoException) => {
    if (isInDevelopment() && !isBenignAbort(err.code)) console.log(err);
  });
}