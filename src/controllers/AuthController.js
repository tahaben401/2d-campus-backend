
import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import encryptPassword from "../utils/encryptPassword.js"
import isPasswordMatch from "../utils/isPasswordMatch.js";
import { supabase } from "../utils/supabase.js";
import { registerSchema, loginSchema } from "../utils/authValidation.js";

const jwtSecret = process.env.JWT_SECRET;
const COOKIE_EXPIRATION_DAYS = 90;
const expirationDate = new Date(
    Date.now() + COOKIE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000
);
const cookieOptions = {
    expires: expirationDate,
    secure: false,
    httpOnly: true,
    sameSite: 'lax'
};

const register = async (req, res, next) => {
    try {
        // Input Validation
        const { error: validationError } = registerSchema.validate(req.body);
        if (validationError) {
            throw new ApiError(400, validationError.details[0].message);
        }

        const { name, email, password } = req.body;
        const { data } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
        const userExists = data;
        if (userExists && userExists.length > 0) {
            throw new ApiError(400, "User already exists!");
        }
        const { data: user, error } = await supabase
            .from('users')
            .insert({
                name,
                email,
                password: await encryptPassword(password)
            })
            .select()
            .single(); // Ensure we get a single object back

        if (error || !user) {
            throw new ApiError(500, "Registration failed: " + (error?.message || "Unknown error"));
        }

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
        // Use next(error) if you want to use the global error handler, or keep this if you prefer custom json response
        // But consistent error handling is better. For now keeping structure but fixing validation
        return res.status(error.statusCode || 500).json({
            status: error.statusCode || 500,
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

const login = async (req, res, next) => {
    try {
        // Input Validation
        const { error: validationError } = loginSchema.validate(req.body);
        if (validationError) {
            throw new ApiError(400, validationError.details[0].message);
        }

        const { email, password } = req.body;
        const { data: user } = await supabase
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
        return res.status(error.statusCode || 500).json({
            status: error.statusCode || 500,
            message: error.message,
        });
    }
};

const logout = (req, res) => {
    res.clearCookie("jwt", {
        httpOnly: true,
      secure: false,  // change to true in production (HTTPS)
      sameSite: "lax",
    });

    return res.json({
        status: 200,
        message: "Logged out successfully",
    });
};

export default {
    register,
    login,
    logout
};
