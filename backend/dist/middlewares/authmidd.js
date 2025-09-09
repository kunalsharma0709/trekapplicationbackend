"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const sec_1 = require("../secretpass/sec");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authMiddleware(req, res, next) {
    const authtoken = req.headers.authorization;
    if (!authtoken || !authtoken.startsWith("Bearer ")) {
        return res.json({
            msg: "invalid token or it doesnot exist"
        });
    }
    const token = authtoken.split(" ")[1];
    const decoded = jsonwebtoken_1.default.verify(token, sec_1.secret);
    req.id = decoded.id;
    next();
}
