import { Hono } from "hono";
import testRoute from "./test.route.js";

const routes = new Hono();

//test route
routes.route("/health-check", testRoute);

export default routes;
"../controllers/test.controller.js";