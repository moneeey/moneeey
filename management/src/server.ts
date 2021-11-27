import *as Bacon from "baconjs";
import fs from 'fs';
import dotenv from 'dotenv';
import express, { Application, Request, Response } from "express";
import Management from "./management"

const prodSecretPath = '/run/secret/prod.env';
dotenv.config(fs.existsSync(prodSecretPath) ? { path: prodSecretPath } : {});

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ManageRequest = (res: Response, cb: (management: Management) => void) =>
	Bacon.once(new Management())
		.flatMap(mng => cb(mng))
		.onValue(response => {
			res.status(200).send(response)
		})

app.post("/database/new", async (req: Request, res: Response) => { ManageRequest(res,
	mng => { return Bacon.once({ status: 'WIP', action: 'create' }) }) });
app.post("/database/share/:database", async (req: Request, res: Response) => { ManageRequest(res,
		mng => { return Bacon.once({ status: 'WIP', action: 'share', database: req.params['database'], to: req.body['to'], shared: req.body['shared'] }) }) });
app.post("/database/destroy/:database", async (req: Request, res: Response) => { ManageRequest(res, mng => { return Bacon.once({ status: 'WIP', action: 'destroy', database: req.params['database'] }) }) });
app.post("/database/export/:database", async (req: Request, res: Response) => { ManageRequest(res, mng => { return Bacon.once({ status: 'WIP', action: 'export', database: req.params['database'] }) }) });
app.post("/database/import", async (req: Request, res: Response) => { ManageRequest(res, mng => { return Bacon.once({ status: 'WIP' }) }) });

app.post("/auth/complete", async (req: Request, res: Response) => { ManageRequest(res,
	mng => mng.auth_complete(req.body['email'].toLowerCase(), req.body['code'])) });
app.post("/auth/start", async (req: Request, res: Response) => { ManageRequest(res,
	mng => mng.auth_start(req.body['email'].toLowerCase())) });
app.get("/", async (req: Request, res: Response) => { res.send('Hello!') });

(() => {
	try {
		const port = parseInt('' + process.env.PORT)
		app.listen(port, (): void => {
			console.info(`Listening successfully on port ${port}`);
		});
	} catch (error: any) {
		console.error(`Error occurred: ${error.message}`);
	}
})()