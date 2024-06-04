import dotenv from 'dotenv'
dotenv.config({
    path:'./env'
})
import connectDB from "./db/index.js";

connectDB();


/*
import express from 'express';
const app = express();
(async()=>{
    try{
        await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
        app.on("Error", (error)=>{
            console.log("Error :" , error);
           
        })
        app.listen(process.env.PORT , ()=>{
            console.log(`App is listening on port : ${process.env.PORT}`)
        })
    }
    catch(error){
        console.error('Error',error);
        
    }

})()
*/