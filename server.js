import express from "express";
import 'dotenv/config';
import importJsonToSupabase from "./src/utils/importJsonToSupabase.js";
import morgan from "morgan";
import errorHandler from "./src/middleware/errorHandler.js";
import errorConverter from "./src/middleware/errorConverter.js";
import userRouter from "./src/routes/authRouter.js";
import cors from "cors"
import rateLimiter from "./src/middleware/rateLimiter.js";
import path from "path";
import logementrouter from "./src/routes/logementsRouter.js";
import dataRouter from "./src/routes/DataRoute.js";
import helmet from "helmet";
import cookieParser from "cookie-parser";


const app = express();
const PORT = process.env.PORT || 3000;
const TABLE_NAME = 'uv_ds_reservsalle';
const JSON_FILE_PATH = 'C:/Users/anas/Documents/so/new wallpapers/donnesdeschambresdetoutlecampus/uv_ds_reservsalle.json';
// Middleware

app.use(helmet());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cookieParser());


// app.use(rateLimiter());

app.use(errorConverter);
app.use(errorHandler);
app.use("/api/v1/auth", userRouter);
app.use("/api/v1/stats", dataRouter);
app.use("/api/v1/logement", logementrouter)

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Express API!'
  });
});
app.get('/fillTable', async (req, res) => {
  
  await importJsonToSupabase(TABLE_NAME, JSON_FILE_PATH, 0);
  res.json({
    message: 'table is filled!'
  });
});
app.get('/fillTable/:filename', async (req, res) => {
  try {

    const fileNameStr = req.params.filename;

    
    if (!/^[a-zA-Z0-9_-]+$/.test(fileNameStr)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename format'
      });
    }

    const TABLE_NAME = fileNameStr;

    // Construct path securely using path.join and ensure it stays within the data directory
    const dataDir = path.join(process.cwd(), 'data');
    const JSON_FILE_PATH = path.join(dataDir, `${fileNameStr}.json`);

    // Verify the resolved path is actually inside the data directory
    if (!JSON_FILE_PATH.startsWith(dataDir)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    console.log(`Tentative d'import de ${JSON_FILE_PATH} vers la table ${TABLE_NAME}...`);

    const result = await importJsonToSupabase(TABLE_NAME, JSON_FILE_PATH, 0);

    res.json({
      success: true,
      message: `Table ${TABLE_NAME} remplie avec succès!`,
      details: result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'importation',
      error: error.message
    });
  }
});




app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});