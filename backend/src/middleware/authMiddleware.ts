import jwt from 'jsonwebtoken';
import { Response as ExpressResponse, NextFunction } from 'express';
import { db } from '../config/db';
import { User, AuthRequest } from '../types';
import { ObjectId } from 'mongodb';

interface JwtPayload {
    id: string;
}

export const protect = async (req: AuthRequest, res: ExpressResponse, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as JwtPayload;

            // Get user from the token
            const usersCollection = db.collection<User>('users');
            // We select -password to exclude the password field from the result
            req.user = await usersCollection.findOne({ _id: new ObjectId(decoded.id) }, { projection: { password: 0 } }) || undefined;
            
            if (!req.user) {
                 return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};