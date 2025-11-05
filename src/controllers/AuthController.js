
import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import encryptPassword from "../utils/encryptPassword.js"
import isPasswordMatch from "../utils/isPasswordMatch.js";
import { supabase } from "../utils/supabase.js";
const jwtSecret = process.env.JWT_SECRET;
const COOKIE_EXPIRATION_DAYS = 90;
const expirationDate = new Date(
    Date.now() + COOKIE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000
);
const cookieOptions = {
    expires: expirationDate,
    secure: false,
    httpOnly: true,
};
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const { data } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
        const userExists =  data;
        if (userExists && userExists.length>0) {
            throw new ApiError(400, "User already exists!");
        }
        const { data:user,error } = await supabase
            .from('users')
            .insert({ 
                name,
                email,
                password: await encryptPassword(password) 
            })
            .select()
        

        const userData = {
            name: user.name,
            email: user.email,
        };

        return res.json({
            status: 200,
            message: "User registered successfully!",
            data: userData,
        });
    } catch (error) {
        return res.json({
            status: 500,
            message: error.message,
        });
    }
};

const createSendToken = async (user, res) => {
    const { name, email, id } = user;
    const token = jwt.sign({ name, email, id }, jwtSecret, {
        expiresIn: "1d",
    });
    
    res.cookie("jwt", token, cookieOptions);

    return token;
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const { data:user } = await supabase
        .from('users')
        .select('id, name, email, password')
        .eq('email', email)
        .maybeSingle()
         if (
            !user ||
            !(await isPasswordMatch(password, user.password))
        ) {
            throw new ApiError(400, "Incorrect email or password");
        }

        const token = await createSendToken(user, res);

        return res.json({
            status: 200,
            message: "User logged in successfully!",
            token,
        });
    } catch (error) {
        return res.json({
            status: 500,
            message: error.message,
        });
    }
};

export default {
    register,
    login,
};