import { PrismaClient } from '@prisma/client'
import { secret } from '../secretpass/sec';
const prisma = new PrismaClient()
// use `prisma` in your application to read and write data in your DB

import express , {Request,Response} from "express";
import zod from "zod";
import jwt from "jsonwebtoken";
import { authMiddleware } from '../middlewares/authmidd';

const router = express.Router();

enum Status {
  Success = 200,
  NotFound = 404,
  ServerError = 500,
  BadRequest = 400
}  

const signupzod = zod.object({
    firstname : zod.string(),
    lastname : zod.string(),
    username : zod.string(),
    password:zod.string()
})
//type infrence  
type a = zod.infer<typeof signupzod>

router.post("/signup",async(req:Request,res:Response)=>{
        const x:a  = req.body;
        const response = signupzod.safeParse(x);
        if(!response.success){
            return res.status(Status.BadRequest).json({
                msg:"invalid inputs"
            })
        } 

        const y = await prisma.user.findFirst({
            where:{
                username : x.username
            }
        })

        if(y){
            return res.status(Status.BadRequest).json({
                msg:"user exist already"
            })
        }
        const z  = await  prisma.user.create({
            data:{
                firstname:x.firstname,
                lastname:x.lastname,
                username:x.username,
                password:x.password
            }
        })

        const id = z.id

        const token = jwt.sign({id:z.id},secret)

        return res.status(Status.Success).json({
            msg: "signed  up  successfully" , token
        })



})


//second route is for the signin purposes
const zodsigninschema = zod.object({
    username : zod.string(),
    password:zod.string()
})

type b = zod.infer<typeof zodsigninschema>

router.post("/signin",async(req:Request,res:Response)=>{
    const x:b  = req.body;
    const response = zodsigninschema.safeParse(
        req.body
    )

    if(!response.success){
        return res.status(Status.BadRequest).json({
            msg:"invalid data"
        })
    }

    const y  = await prisma.user.findFirst({
        where:{
            username:x.username,
            password : x.password
        }
    })
    

    if(!y){
        return res.status(Status.NotFound).json({
            msg:"user doesnot exist"
        })
    }

    const token = jwt.sign({id:y.id},secret)

    return res.status(Status.Success).json({
        msg:"signedup successgully",token
    })
})

//third route is to filter the users on the basis of there first and the last name

router.get("/filternames/:search", authMiddleware,async (req:Request,res:Response)=>{
    const id = req.id;
    const search = req.params.search;
   const bobo =  await prisma.user.findFirst({
        where:{
            id
        }
    })
  
    if(!bobo){
        return res.status(Status.NotFound).json({
            msg:"not a valid user"
        })
    }

   const users =     await prisma.user.findMany({
        where : {
            OR:[
                {firstname : {contains:search , mode:"insensitive"}},
                {lastname: {contains:search, mode : "insensitive"}}
            ]
        }
    })

    return res.status(Status.Success).json({
        msg:"user found",
       users
    })




})


// fourth route is to update the users information 

router.put("/updateinfo",authMiddleware,async(req:Request,res:Response)=>{
    const id = req.id;
    const updateparams = req.body;
    const  bobo = await prisma.user.findFirst({
        where:{
            id
        }
    })

    if(!bobo){
        return res.status(Status.NotFound).json({
            msg:"invalid token"
        })
    }
 
 await prisma.user.update({
        where:{
            id
        },data:{
            firstname:updateparams.firstname,
            lastname:updateparams.lastname,
            password:updateparams.password
        }
    })
 

    return res.status(Status.Success).json({
        msg:"updation happened successfully"
    })

    
})




