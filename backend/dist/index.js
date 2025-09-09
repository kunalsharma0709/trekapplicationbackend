"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const helmet_1 = __importDefault(require("helmet"));
const maps_1 = __importDefault(require("./mapsroutes/maps"));
const user_1 = __importDefault(require("./userroutes/user"));
const cors_1 = __importDefault(require("cors"));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// CSP config
app.use(helmet_1.default.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "http://localhost:3000", "http://localhost:4000"], // ✅ 4000 bhi allow kiya
    },
}));
app.use("/maps", maps_1.default);
app.use("/users", user_1.default);
app.listen(3000);
