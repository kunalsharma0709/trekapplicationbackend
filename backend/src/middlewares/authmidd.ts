import { NextFunction , Request,Response } from "express";
import { secret } from "../secretpass/sec";
import jwt from "jsonwebtoken"
import { JwtPayload } from "jsonwebtoken";
export function authMiddleware(req:Request, res:Response , next:NextFunction){
       
   const authtoken = req.headers.authorization;
   
   if(!authtoken || !authtoken.startsWith("Bearer ")){
    return res.json({
        msg:"invalid token or it doesnot exist"
    })
   }

   const token = authtoken.split(" ")[1]
   

   const decoded = jwt.verify(token,secret) as JwtPayload;

   req.id = decoded.id;

   next()

}