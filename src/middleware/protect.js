import jwt from 'jsonwebtoken';
import { supabase } from '../utils/supabase.js';
import ApiError from '../utils/ApiError.js';

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {  // Utiliser l'optional chaining
        token = req.cookies.jwt;
    }

    if (!token) {
        return next(new ApiError(401, 'Vous n\'êtes pas connecté! Veuillez vous connecter pour accéder.'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const { data: currentUser, error } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id', decoded.id)
            .single();

        if (error || !currentUser) {
            return next(new ApiError(401, 'L\'utilisateur appartenant à ce token n\'existe plus.'));
        }

        req.user = currentUser;
        next();
    } catch (error) {
        return next(new ApiError(401, 'Token invalide ou expiré.'));
    }
};

export default protect;