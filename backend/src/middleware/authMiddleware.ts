
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { usersCollection } from '../models/userModel';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };

            // Get user from the token
            const user = await usersCollection().findOne({ _id: new ObjectId(decoded.id) }, { projection: { passwordHash: 0 } });
            
            if (!user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            req.user = user;
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
