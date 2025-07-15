
import { db } from '../config/db';
import { Planet } from '../types';

export const planetsCollection = db.collection<Planet>('planets');
