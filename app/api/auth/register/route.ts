// app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'; 

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { name, email, password } = await req.json();


    if (!name || !email || !password) { /* ... */ }
    if (password.length < 6) { /* ... */ }
    const existingUser = await User.findOne({ email });
    if (existingUser) { /* ... */ }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    
    // add the following login logic
    
    // create JWT
    const payload = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    // Delete the password from the returned user information
    const userResponse = newUser.toObject();
    delete userResponse.password;

    // Return the same data structure as the login interface
    return NextResponse.json({
      message: 'Registration and login successful',
      token,
      user: userResponse,
    }, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}