type IID = string;

interface IEntity {
  _id: IID;
  _rev?: string;
  created: number;
  updated: number;
}

interface IDatabase {
  database_id: IID;
  level: number;
}

interface IAuth {
  status?: string;
  confirm_code: string;
  code: string;
  created: number;
}

interface ILogin {
  email: string;
  auth: IAuth;
}

interface ISession {
  code: string;
  created: number;
}

interface IUser extends IEntity {
  email: string;
  databases: Array<IDatabase>;
  auth: Array<IAuth>;
  sessions: Array<ISession>;
}

export { IAuth, ILogin, ISession, IUser };
