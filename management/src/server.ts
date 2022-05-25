import express, { Application } from 'express';

import { defaultRoutes, authRoutes, storageRoutes } from './routes';
import { PORT } from './core/config';

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', defaultRoutes);
app.use('/auth', authRoutes);
app.use('/storage', storageRoutes);

const main = () => {
  try {
    app.listen(PORT, (): void => console.info(`Listening successfully on port ${PORT}`));
  } catch (error: any) {
    console.error(`Error occurred: ${error.message}`);
  }
};

main();
