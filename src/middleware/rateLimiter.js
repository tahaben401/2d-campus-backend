import rateLimit from 'express-rate-limit';

const rateLimiter = (options) => 
    rateLimit({
      windowMs: 60 * 60 * 1000, 
      max: 10, 
      standardHeaders: true,
      legacyHeaders: false, 
      message: 'Too many requests, please try again later'
    });

export default rateLimiter;