import { Router } from "express";
import AuthController from "../controllers/AuthController.js";
import DataConroller from "../controllers/DataConroller.js";

const dataRouter = Router();


dataRouter.get("/",DataConroller.getStats)


export default dataRouter;