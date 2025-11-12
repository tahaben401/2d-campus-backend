import express from "express";
import 'dotenv/config';
import importJsonToSupabase from "./src/utils/importJsonToSupabase.js";
import morgan from "morgan";
import errorHandler from "./src/middleware/errorHandler.js";
import errorConverter from "./src/middleware/errorConverter.js";
import userRouter from "./src/routes/authRouter.js";
import cors from "cors"



const app = express();
const PORT = process.env.PORT || 3000 ;
const TABLE_NAME = 'uv_ds_reservsalle';
const JSON_FILE_PATH = 'C:/Users/anas/Documents/so/new wallpapers/donnesdeschambresdetoutlecampus/uv_ds_reservsalle.json';
const corsOptions = {
  origin : (origin, callback) => {
      if(whiteList.indexOf(origin) !== -1 || !origin){
          callback(null, true);
      }
      else{
         callback(new Error('Not Allowed by CROS')) ;
      }
  },
  optionsSuccessStatus: 200, // For legacy browser support, keep this set to 200
}
// Middleware

app.use(cors({
  origin: "http://localhost:5173",  
  credentials: true,                
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(errorConverter);
app.use(errorHandler);
app.use("/api/v1/auth",userRouter);

app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the Express API!'
  });
});
app.get('/fillTable',async (req, res) => {
    await importJsonToSupabase(TABLE_NAME,JSON_FILE_PATH,0);
    res.json({ 
      message: 'table is filled!'
    });
});






app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});