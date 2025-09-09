"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const sec_1 = require("../secretpass/sec");
const prisma = new client_1.PrismaClient();
// use `prisma` in your application to read and write data in your DB
const express_1 = __importDefault(require("express"));
const zod_1 = __importDefault(require("zod"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authmidd_1 = require("../middlewares/authmidd");
const router = express_1.default.Router();
var Status;
(function (Status) {
    Status[Status["Success"] = 200] = "Success";
    Status[Status["NotFound"] = 404] = "NotFound";
    Status[Status["ServerError"] = 500] = "ServerError";
    Status[Status["BadRequest"] = 400] = "BadRequest";
})(Status || (Status = {}));
const signupzod = zod_1.default.object({
    firstname: zod_1.default.string(),
    lastname: zod_1.default.string(),
    username: zod_1.default.string(),
    password: zod_1.default.string()
});
router.post("/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const x = req.body;
    const response = signupzod.safeParse(x);
    if (!response.success) {
        return res.status(Status.BadRequest).json({
            msg: "invalid inputs"
        });
    }
    const y = yield prisma.user.findFirst({
        where: {
            username: x.username
        }
    });
    if (y) {
        return res.status(Status.BadRequest).json({
            msg: "user exist already"
        });
    }
    const z = yield prisma.user.create({
        data: {
            firstname: x.firstname,
            lastname: x.lastname,
            username: x.username,
            password: x.password
        }
    });
    const id = z.id;
    const token = jsonwebtoken_1.default.sign({ id: z.id }, sec_1.secret);
    return res.status(Status.Success).json({
        msg: "signed  up  successfully", token
    });
}));
//second route is for the signin purposes
const zodsigninschema = zod_1.default.object({
    username: zod_1.default.string(),
    password: zod_1.default.string()
});
router.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const x = req.body;
    const response = zodsigninschema.safeParse(req.body);
    if (!response.success) {
        return res.status(Status.BadRequest).json({
            msg: "invalid data"
        });
    }
    const y = yield prisma.user.findFirst({
        where: {
            username: x.username,
            password: x.password
        }
    });
    if (!y) {
        return res.status(Status.NotFound).json({
            msg: "user doesnot exist"
        });
    }
    const token = jsonwebtoken_1.default.sign({ id: y.id }, sec_1.secret);
    return res.status(Status.Success).json({
        msg: "signedup successgully", token
    });
}));
//third route is to filter the users on the basis of there first and the last name
router.get("/filternames/:search", authmidd_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.id;
    const search = req.params.search;
    const bobo = yield prisma.user.findFirst({
        where: {
            id
        }
    });
    if (!bobo) {
        return res.status(Status.NotFound).json({
            msg: "not a valid user"
        });
    }
    const users = yield prisma.user.findMany({
        where: {
            OR: [
                { firstname: { contains: search, mode: "insensitive" } },
                { lastname: { contains: search, mode: "insensitive" } }
            ]
        }
    });
    return res.status(Status.Success).json({
        msg: "user found",
        users
    });
}));
// fourth route is to update the users information 
router.put("/updateinfo", authmidd_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.id;
    const updateparams = req.body;
    const bobo = yield prisma.user.findFirst({
        where: {
            id
        }
    });
    if (!bobo) {
        return res.status(Status.NotFound).json({
            msg: "invalid token"
        });
    }
    yield prisma.user.update({
        where: {
            id
        }, data: {
            firstname: updateparams.firstname,
            lastname: updateparams.lastname,
            password: updateparams.password
        }
    });
    return res.status(Status.Success).json({
        msg: "updation happened successfully"
    });
}));
exports.default = router;
