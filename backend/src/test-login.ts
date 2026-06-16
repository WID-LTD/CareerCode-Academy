import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import * as UserModel from './models/user';
import { generateToken, generateRefreshToken } from './utils/helpers';

async function testLogin() {
  try {
    const email = 'admin@careercode.com';
    const password = 'password';

    const user = await UserModel.getUserByEmail(email);
    if (!user) {
      console.log("User not found!");
      return;
    }

    console.log("User password hash:", user.password);
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch);

    const tokenPayload = { userId: user.id, role: user.role as any };
    console.log("Generating token with payload:", tokenPayload);
    console.log("JWT_SECRET in process.env is:", process.env.JWT_SECRET);
    
    const token = generateToken(tokenPayload);
    console.log("Token generated successfully!");

    const refreshToken = generateRefreshToken(tokenPayload);
    console.log("Refresh token generated successfully!");

    console.log("Test login succeeded!");
  } catch (err) {
    console.error("Test login failed with error:", err);
  }
}

testLogin();
