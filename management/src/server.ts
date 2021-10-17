import * as Bacon from "baconjs";
import fs from 'fs';
import dotenv from 'dotenv';
import express, { Application, Request, Response } from "express";
import Management from "./management"

const prodSecretPath = '/run/secret/prod.env';
dotenv.config(fs.existsSync(prodSecretPath) ? { path: prodSecretPath } : {});

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ManageRequest = (req: Request, res: Response, cb: (management: Management) => void) =>
	Bacon.once(new Management())
		.flatMap(mng => cb(mng))
		.take(1)
		.flatMapError(error => {
			console.log('error', { error })
			return { status: 'error' }
		})
		.onValue(response => {
			res.status(200).send(response)
		})

app.post("/auth/complete", async (req: Request, res: Response) => {
	ManageRequest(req, res, mng => {
		return mng.complete_login(mng.connect_default_db(), req.body['email'].toLowerCase(), req.body['code'])
	})
});

app.post("/auth/start", async (req: Request, res: Response) => {
	ManageRequest(req, res, mng => {
		return mng.request_login(mng.connect_default_db(), req.body['email'].toLowerCase())
	})
});

try {
	const port = parseInt('' + process.env.PORT)
	app.listen(port, (): void => {
		console.info(`Listening successfully on port ${port}`);
	});
} catch (error: any) {
	console.error(`Error occured: ${error.message}`);
}