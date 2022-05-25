import { Request, Response } from 'express';
import AuthController from '../controller/auth_controller';
import { IUser } from '../entities';

type HandleAPIFn = (req: Request, res: Response) => Promise<object>
export const HandleAPI = (handle: HandleAPIFn) => {
  return async (req: Request, res: Response) => {
    try {
      const response = await handle(req, res)
      res.status(200).send(JSON.stringify(response))
    } catch(e) {
      console.error('HandleAPI', e)
      res.status(500).send('Ops!')
      throw e
    }
  }
}

type HandleAuthAPIFn = (req: Request, res: Response, user: IUser) => Promise<object>
export const HandleAuthAPI = (authController: AuthController, handle: HandleAuthAPIFn) => HandleAPI(async (req, res) => {
  const auth_code = (req.headers['authorization']||'').replace('Bearer ', '')
  const email = (''+req.headers['email']).toLowerCase()
  const user = await authController.authenticate(email, auth_code)
  console.log({ auth_code, email, user })
  if (user) {
    return await handle(req, res, user)
  } else {
    console.error('HandleAuthAPI invalid email/authCode', email)
    return { status: 401, error: 'Unauthorized' }
  }
})
