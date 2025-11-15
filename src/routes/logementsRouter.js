
import { Router } from "express";
import { getLogements } from "../controllers/LogementsController.js";
import { getDetailsCompletsChambres } from "../controllers/LogementsController.js";     

const logementrouter = Router();

logementrouter.get("/", getLogements);
logementrouter.get("/detail_chambre", getDetailsCompletsChambres);

export default logementrouter;

