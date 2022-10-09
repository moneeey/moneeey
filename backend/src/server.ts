import http from 'http';
import express from 'express';

import { defaultRoutes, authRoutes, storageRoutes } from './routes';
import { PORT } from './core/config';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", defaultRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/storage", storageRoutes);

const server = http.createServer(app)

const terminateServer = () => server.close(() => console.info('Server terminated'));

process.on('SIGINT', terminateServer);

process.on('SIGTERM', terminateServer);

const main = () => {
  try {
    server.listen(PORT, () => console.info(`Listening successfully on port ${PORT}`));
  } catch ({ message }) {
    console.error(`Error occurred: ${message}`);
  }
};

main();
