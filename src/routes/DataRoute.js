import { Router } from "express";
import AuthController from "../controllers/AuthController.js";
import DataConroller from "../controllers/DataConroller.js";
import protect from "../middleware/protect.js";

const dataRouter = Router();


dataRouter.get("/", protect, DataConroller.getStats)


export default dataRouter;