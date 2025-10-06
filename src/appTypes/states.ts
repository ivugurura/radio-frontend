export type Verb = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export interface IActionSchema {
  suffix?: string;
  action?: string;
  api: IAPI;
}
export interface IAction {
  // CRUD actions
  create: Partial<IActionSchema>;
  view: Partial<IActionSchema>;
  list: Partial<IActionSchema>;
  update: Partial<IActionSchema>;
  delete: Partial<IActionSchema>;

  // Custom actions
  [key: string]: Partial<IActionSchema>;
}
export interface IStateSchema {
  entity: string;
  actions: Partial<IAction>;
}
export interface IAPI {
  endpoint: string;
  verb: Verb;
  isMutation?: boolean;
  hasBody?: boolean;
  isDownload?: boolean;
}
