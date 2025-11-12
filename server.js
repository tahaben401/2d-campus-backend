import express from "express";
import 'dotenv/config';
import importJsonToSupabase from "./src/utils/importJsonToSupabase.js";
import morgan from "morgan";
import errorHandler from "./src/middleware/errorHandler.js";
import errorConverter from "./src/middleware/errorConverter.js";
import userRouter from "./src/routes/authRouter.js";
import path from "path";




const app = express();
const PORT = process.env.PORT || 3000 ;
// Middleware
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
app.get('/fillTable/:filename', async (req, res) => {
    try {
        
        const fileNameStr = req.params.filename;
        const TABLE_NAME = fileNameStr; 
        
        const JSON_FILE_PATH = path.join(process.cwd(), 'data', `${fileNameStr}.json`);

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