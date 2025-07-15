
import { db } from '../config/db';
import { Alliance } from '../types';

export const alliancesCollection = db.collection<Alliance>('alliances');
