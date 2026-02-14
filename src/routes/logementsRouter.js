
import { Router } from "express";
import { getLogements } from "../controllers/LogementsController.js";
import { getDetailsCompletsChambres } from "../controllers/LogementsController.js";
import { getChambresParBatiment } from "../controllers/LogementsController.js";
import protect from "../middleware/protect.js";

const logementrouter = Router();

logementrouter.get("/", protect, getLogements);
logementrouter.get("/detail_chambre", protect, getDetailsCompletsChambres);
logementrouter.get("/batiment/:batiment", getChambresParBatiment);
export default logementrouter;


