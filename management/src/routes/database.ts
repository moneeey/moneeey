import express, { Router, Request, Response } from 'express';

import { ManageRequest } from '.';

const router: Router = express.Router();

router.post('/new', async (_: Request, res: Response) =>
  ManageRequest(res, (_) => ({ status: 'WIP', action: 'create' }))
);

router.post('/share/:database', async (req: Request, res: Response) =>
  ManageRequest(res, (_) => ({
      status: 'WIP',
      action: 'share',
      database: req.params['database'],
      to: req.body['to'],
      shared: req.body['shared']
    }))
);

router.post('/destroy/:database', async (req: Request, res: Response) =>
  ManageRequest(res, (_) => ({ status: 'WIP', action: 'destroy', database: req.params['database'] }))
);

router.post('/export/:database', async (req: Request, res: Response) =>
  ManageRequest(res, (_) => ({ status: 'WIP', action: 'export', database: req.params['database'] }))
);

router.post('/import', async (_: Request, res: Response) => ManageRequest(res, (_) => ({ status: 'WIP' })));

export default router;
