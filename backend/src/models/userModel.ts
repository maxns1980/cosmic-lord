
import { db } from '../config/db';
import { User } from '../types';

// In a larger app, you might have more complex methods here.
// For now, we just export the collection as a function.
export const usersCollection = () => db.collection<User>('users');
