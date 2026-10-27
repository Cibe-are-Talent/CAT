import path from "path";
import fs from "fs";
import express, { Router, Request, Response } from "express";
import { isInDevelopment, safeError } from "../utils/Functions";
import { config } from "../utils/Storage";

/**
 * Views router
 *
 * `/views`: GET
 *
 * `/views/:file`: GET
 */
const router: Router = express.Router({ caseSensitive: true });

router.get("/views/:file", (req: Request, res: Response) => {
  if (typeof req.params.file !== "string") {
    res.status(500).end();
    return;
  }

  const fullPath: string = path.resolve(`./views/${req.params.file}`);
  const filename: string = path.parse(fullPath).base;
  if (fs.existsSync(fullPath) && config.config.viewsFiles.includes(filename))
    res.status(200).sendFile(fullPath, (err2: NodeJS.ErrnoException | null | undefined) => {
      if (err2) {
        if (isInDevelopment() && err2.code !== "ECONNABORTED" && err2.code !== "ECONNRESET" && err2.code !== "EPIPE")
          console.log(err2);
        safeError(res, 500);
      }
    });
  else res.status(404).end();
});

export default router;
