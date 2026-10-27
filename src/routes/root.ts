// External libs
import fs from "fs";
import path from "path";
import express, { Router, Request, Response } from "express";

/**
 * Root router
 *
 * `/`: GET
 *
 * `/robots.txt`: GET
 */
const router: Router = express.Router({ caseSensitive: true });

router.get("/", (_req: Request, res: Response) => res.redirect('/home'));

router.get("/robots.txt", (_req: Request, res: Response) => {
  const robotsFilePath: string = path.resolve("./views/robots.txt");

  if (fs.existsSync(robotsFilePath)) {
    const robots: string = fs.readFileSync(robotsFilePath, "ascii");

    if (robots.length > 0) res.type("text/plain").send(robots).end();
    else res.status(404).end();
  } else res.status(404).end();
});

export default router;
