import * as Bacon from "baconjs";
import fs from 'fs';
import dotenv from 'dotenv';
import koa from 'koa';
import koaBody from 'koa-body';
import Management from "./management.js"

const prodSecretPath = '/run/secret/prod.env';
dotenv.config(fs.existsSync(prodSecretPath) ? { path: prodSecretPath } : {});
const app = new koa();

app.use(koaBody());

app.use(function index(ctx, next) {
	try {
		if ('/auth' == ctx.path && ctx.method === 'POST') {
			const email = ctx.request.body['email']
			const code = ctx.request.body['code']
			// const mngmt = new Management()
			// if (!code && email) {
				// stream = stream.flatMap(() => Bacon.try(mngmt.request_login(mngmt.connect(), email)))
			// } else if (code && email) {
				// stream = stream.flatMap(() => Bacon.try(mngmt.authorize(email, code))))
			// }
			Bacon.once(undefined)
				// .flatMap(() => mngmt.request_login(mngmt.connect(), email))
				.flatMap(() => 'Hello')
				.doLog()
				.onValue(response => {
					console.log('onValue', response)
					ctx.body = response
					next()
				})
		}
	} catch (error) {
		console.error('server error', { error })
	}
});

app.listen(process.env.PORT, function () {
	console.log('Server running on http://localhost:' + process.env.PORT)
});
