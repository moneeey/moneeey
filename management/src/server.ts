import fs from 'fs';

import dotenv from 'dotenv';
import express, { Application } from 'express';

import { defaultRoutes, authRoutes, databaseRoutes } from './routes';

const ENV_FILE = '/run/secret/prod.env';

const env = process.env;

dotenv.config(fs.existsSync(ENV_FILE) ? { path: ENV_FILE } : {});

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', defaultRoutes);
app.use('/auth', authRoutes);
app.use('/database', databaseRoutes);

const main = () => {
  try {
    const port = parseInt(env.PORT || '3000');
    app.listen(port, (): void => console.info(`Listening successfully on port ${port}`));
  } catch (error: any) {
    console.error(`Error occurred: ${error.message}`);
  }
};

main();
