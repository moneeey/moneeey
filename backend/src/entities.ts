export type IID = string;
export type IDate = number;

interface IUpdatable {
  created: IDate;
  updated: IDate;
}

export interface IEntity extends IUpdatable {
  _id: IID;
  _rev?: string;
}

export enum IDatabaseLevel {
  OWNER = 90,
  USER = 50,
  INVITED = 10,
}

export interface IDatabase extends IUpdatable {
  realm_host: string;
  realm_database_id: string;
  description: string;
  level: IDatabaseLevel;
}

export interface IAuth extends IUpdatable {
  confirmed: boolean;
  confirm_code: string;
  auth_code: string;
}

export interface IUser extends IEntity {
  email: string;
  databases: Array<IDatabase>;
  auth: Array<IAuth>;
}
