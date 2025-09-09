import express from "express";
const app = express();
import helmet from "helmet"
import maprouter from "./mapsroutes/maps"
import userrouter from "./userroutes/user"
import cors from "cors";
app.use(cors());
app.use(express.json());

// CSP config
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "http://localhost:3000", "http://localhost:4000"], // ✅ 4000 bhi allow kiya
    },
  })
);


app.use("/maps",maprouter);
app.use("/users",userrouter);

app.listen(3000);

