 import ApiError from "../utils/ApiError.js";
 
 const errorConverter = (err, req, res, next) => {
    let error = err;
    if (!(error instanceof ApiError)) {
        const statusCode =
            error.statusCode ||
            (error instanceof Error
                ? 400 // Bad Request
                : 500); // Internal Server Error
        const message =
            error.message ||
            (statusCode === 400 ? "Bad Request" : "Internal Server Error");
        error = new ApiError(statusCode, message, false, err.stack.toString());
    }
    next(error);
};
export default errorConverter;