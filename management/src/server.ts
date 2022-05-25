import express, { Application } from 'express';

import { defaultRoutes, authRoutes, databaseRoutes } from './routes';
import { PORT } from './core/config';

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', defaultRoutes);
app.use('/auth', authRoutes);
app.use('/database', databaseRoutes);

const main = () => {
  try {
    app.listen(PORT, (): void => console.info(`Listening successfully on port ${PORT}`));
  } catch (error: any) {
    console.error(`Error occurred: ${error.message}`);
  }
};

main();
