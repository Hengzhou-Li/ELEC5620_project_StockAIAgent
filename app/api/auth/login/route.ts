// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


export async function POST(req: Request) {
  try {
    await dbConnect();

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Please fill in your email address and password' }, { status: 400 });
    }

    // When querying users, force the password field that is hidden by 'select: false' to be included
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return NextResponse.json({ error: 'The email or password is incorrect' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json({ error: 'The email or password is incorrect' }, { status: 401 });
    }

    // 创建 JWT
    const payload = {
      id: user._id,
      name: user.name,
      email: user.email,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      { expiresIn: '1d' } // Token validity period is one day
    );

    // Delete the password from the returned user information
    const userResponse = user.toObject();
    delete userResponse.password;

    return NextResponse.json({
      message: 'login successful',
      token,
      user: userResponse,
    }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}