import { asyncHandler } from "../utils/asyncHandler.js";
import {APIError} from "../utils/APIError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import z from 'zod'

const registrationSchema = z.object({
   username: z.string().min(3).nonempty({ message: "Username cannot be empty" }),
   fullname: z.string().min(6).nonempty({ message: "Fullname cannot be empty" }),
   email: z.string().email().nonempty({ message: "Email cannot be empty" }),
   password: z.string().min(8).nonempty({ message: "Password cannot be empty" })
 });

const registerUser = asyncHandler(async(req,res)=>{
    //get user details from frontend 
    //validation - not empty 
    //check if user already exists
    //check for images  , check for avatar 
    //upload them to cloudinary 
    //create user object - create entry in db
    //remove password and refresh token field from response 
    //check for user creation
    //return response 

    const {fullname , username , email , password} = registrationSchema.parse(req.body) ;

    const existingUser = await User.findOne({
      $or : [{username} , {email}]
    })
    if(existingUser){
      throw new APIError(409 , 'User with existing username or email already exists')
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
  
    let coverImageLocalPath ;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
      coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
      throw new APIError(400 , "Avatar is required 1")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar){
      throw new APIError(400 , "Avatar is required 2")
    }

    const user = await User.create({
      fullname ,
      username ,
      email ,
      avatar : avatar.url ,
      coverImage : coverImage?.url || "",
      password ,
      username : username.toLowerCase()

    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken") ;
     if(!createdUser){
      throw new APIError(500 , "Something went wrong while registering the user ")
     }
     return res.status(201).json(
      new ApiResponse(200 , createdUser , "User registered successfully" )
     )


    
     


})


export {registerUser}