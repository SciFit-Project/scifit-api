import { Hono } from "hono";
import * as testController from "../controllers/test.controller.js";
const testRoute = new Hono();

testRoute.get("/", testController.getHealth);

export default testRoute;