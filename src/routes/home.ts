// External libs
import express, { Router, Request, Response } from "express";

/**
 * Home router
 *
 * `/home`: GET
 */
const router: Router = express.Router({ caseSensitive: true });

router.get("/home", (_req: Request, res: Response) => {
  res.render('home', {
    stylesheet: '/views/home.css',
    script: '/views/home.js',
    favicon: null,
    message: 'Gyaru'
  })
});

/*

 ------------- EXEMPLU CONECTARE BAZA DE DATE -------------

server.database.getConnection(
            (err: NodeJS.ErrnoException | null, connection: PoolConnection) => {
              if (server.database) {
                if (err) {
                  if (isInDevelopment()) console.log(err);
                  res.status(500).end();
                  server.database.releaseConnection(connection);
                  return;
                }

                connection.query(
                  "SELECT * FROM `users` WHERE `username`=? OR `email`=?",
                  [username, email],
                  (err2: QueryError | null, result: QueryResult) => {
                    if (err2) {
                      if (isInDevelopment()) console.log(err2);
                      res.status(500).end();
                      server.database!.releaseConnection(connection);
                      return;
                    }

                    server.database!.releaseConnection(connection);

                    let userExists: boolean = false;

                    if (Array.isArray(result)) {
                      if (result.length > 0) userExists = true;
                    } else if (result.fieldCount > 0) userExists = true;

                    if (userExists) res.status(200).send("found").end();
                    else res.status(200).send("notfound").end();
                  },
                );
              }
            },
          );
*/

export default router;
