
import { User as CustomUser } from '../types'; // Import your custom User type

declare global {
  namespace Express {
    export interface Request {
      user?: CustomUser;
    }
  }
}
