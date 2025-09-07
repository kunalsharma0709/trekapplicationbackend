import "express";

declare module "express-serve-static-core" {
  interface Request {
    id?: number;  // ya string agar tumhare DB me id string hai
  }
}
