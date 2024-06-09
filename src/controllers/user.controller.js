import { asyncHandler } from "../utils/asyncHandler.js";
import {APIError} from "../utils/APIError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import z from 'zod'
import jwt from "json"

const registrationSchema = z.object({
   username: z.string().min(3).nonempty({ message: "Username cannot be empty" }),
   fullname: z.string().min(6).nonempty({ message: "Fullname cannot be empty" }),
   email: z.string().email().nonempty({ message: "Email cannot be empty" }),
   password: z.string().min(8).nonempty({ message: "Password cannot be empty" })
 });

const generateAccessAndRefreshToken = async (userId) => {
   try{
      const user = await User.findById(userId);
      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();
      user.refreshToken = refreshToken;
      await user.save({validateBeforeSave : false})
      return {accessToken , refreshToken}
   }
   catch(error){
      throw new APIError(500 , "Something went wrong while generating access and refresh tokens ")
   }
} 

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

const loginUser = asyncHandler(async(req , res)=>{
   //req body data
   //username or email 
   //find the user 
   //password check 
   //access and refresh token 
   //send cookie
 const {username , email , password} = req.body;
 console.log('username:', username);
console.log('email:', email);
console.log('password :' , password)
 if(!(username || email)){
   throw new APIError(400 , "username or email is required")
 }

 const user = await User.findOne({
   $or : [{username} , {email}]
 }
 )
 if(!user){
   throw new APIError(404 , "User not found")
 }
 const isPasswordValid = await user.isPasswordCorrect(password)

 if(!isPasswordValid){
   throw new APIError(401 , "User credentials incorrect")
 }

 const {accessToken , refreshToken} = await generateAccessAndRefreshToken(user._id)

 const loggedInUser = await  User.findById(user._id)

 const options = {
   httpOnly : true ,
   secure : true 
 }
 res.status(200).cookie("accessToken",accessToken , options)
 .cookie("refreshToken" ,refreshToken ,  options).json(
    new ApiResponse(200 , {
      user :loggedInUser , accessToken , refreshToken
    } , "User logged in successfully")
 )
 
})

const logoutUser = asyncHandler(async(req , res)=>{
   await User.findByIdAndUpdate(
      req.user._id,
      {
         $set : {
            refreshToken : undefined
         }
      },{
         new : true 
      }
   );
   const options = {
      httpOnly : true ,
      secure : true 
   }
   return res.status(200).clearCookie("accessToken", options)
   .clearCookie("refreshToken" , options)
   .json(
      new ApiResponse(200 , {} , "User logged out")
   )
  

})

const refreshAccessToken = asyncHandler(async(req,res)=>{
 try {
  const incomingToken = req.cookies.refreshToken || req.body.refreshToken
  if(!incomingToken){
   throw new APIError(401 , "unauthorized request")
  }
  const decodedToken = jwt.verify(incomingToken , process.env.REFRESH_TOKEN_SECRET);
 
  const user = await User.findById(decodedToken?._id).select("-passoword");
  if(!user){
   throw new ApiResponse(401 , "invalid refresh token")
  }
  if(user.refreshToken !== incomingToken){
     throw new APIError(401 , "refresh token is expired or used")
  }
  const options = {
   httpOnly : true ,
   secure : true
  }
  const {accessToken , newrefreshToken} = await generateAccessAndRefreshToken(user._id)
  return res.status(200).cookie("accessToken" , accessToken , options)
  .cookie("refreshToken",newrefreshToken , options)
  .json(
   new ApiResponse(200 , {accessToken , refreshToken : newrefreshToken} , "Access token refreshed")
  )
 } catch (error) {
    throw new APIError(401 , error?.message || "invalid refresh token")
  
 }
})


export {registerUser , loginUser , logoutUser , refreshAccessToken}