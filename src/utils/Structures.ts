// External libs
import fs from "fs";
import http from "http";
import https from "https";
import { Pool } from "express-mysql-session/node_modules/mysql2/typings/mysql/index";
import { Express } from "express";

/**
 * The object model for the command prompt commands
 * @interface
 */
export interface Command {
  name: string;
  aliases: string[];
  execute: (args?: string[]) => void;
}

/**
 * The server configuration model
 * @interface
 */
export interface ServerConfig {
  /**
   * The domain name
   */
  domain: string;

  /**
   * The port number
   */
  port: number;

  /**
   * The server's socket timeout
   */
  socketTimeout: number;

  /**
   * The server's keep-alive timeout
   */
  keepAliveTimeout: number;

  /**
   * The server's request timeout
   */
  requestTimeout: number;

  /**
   * The server's headers timeout
   */
  headersTimeout: number;
}

/**
 * The object model for the `config.json` file
 * @interface
 */
export interface ConfigObject {
  /**
   * The server configuration
   */
  server: ServerConfig;
  
  /**
   * Whether or not account creation is allowed
   */
  signupAllowed: boolean;

  /**
   * Whether or not a database is required when running the server
   */
  databaseRequired: boolean;

  /**
   * Files (in the `views` folder) allowed to be sent to the client
   */
  viewsFiles: string[];
}

/**
 * The object model for storing the server's instances
 * @interface
 */
export interface Server {
  /**
   * The Express app
   */
  app: Express | undefined;

  /**
   * The server instance
   */
  server: http.Server | https.Server | undefined;

  /**
   * The database connection pool
   */
  database: Pool | undefined;
}

/**
 * The object model for `session.user`
 * @interface
 */
export interface User {
  user_id: number;
  username: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  creation_date: number;
  last_active: number;
  admin: boolean;
  password?: string;
  expire?: number;
}

/**
 * @class
 * The class where the `config.json` content and path are stored
 */
export class Config {
  /**
   * Configuration object
   */
  config: ConfigObject;

  /**
   * Configiration file path
   */
  readonly configFilePath: string | null = null;

  /**
   * `Config`'s constructor
   * @param configFilePath Config file path
   */
  constructor(configFilePath: string) {
    const config: ConfigObject | null | undefined = JSON.parse(
      fs.readFileSync(configFilePath, "utf-8"),
    );

    if (config && typeof config === "object") {
      this.config = config;
      this.configFilePath = configFilePath;
    } else throw new Error("Invalid config file");
  }

  /**
   * Refreshes the `config` object, re-reading the `config.json` file
   * @function
   * @returns {void}
   */
  reload(): void {
    const config: ConfigObject | null | undefined = JSON.parse(
      fs.readFileSync(this.configFilePath!, "utf-8"),
    );

    if (config && typeof config === "object") this.config = config;
    else throw new Error("Invalid config file");
  }

  /**
   * Rewrites the `config.json` from the stored `config` object or the a `newConfig` object (if defined)
   * @function
   * @param newConfig A `ConfigObject` from where to rewrite the config file
   * @returns {void}
   */
  rewrite(newConfig?: ConfigObject): void {
    if (newConfig) {
      fs.writeFileSync(
        this.configFilePath!,
        JSON.stringify(newConfig, null, "\t"),
        "utf-8",
      );

      this.config = newConfig;
    } else
      fs.writeFileSync(
        this.configFilePath!,
        JSON.stringify(this.config, null, "\t"),
        "utf-8",
      );
  }
}
