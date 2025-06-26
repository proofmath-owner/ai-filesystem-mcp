export interface IService {
  name: string;
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
}