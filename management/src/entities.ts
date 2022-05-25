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

export interface IDatabase {
  database_id: IID;
  level: number;
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