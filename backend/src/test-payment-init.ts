import dotenv from 'dotenv';
dotenv.config();

import * as UserModel from './models/user';
import * as CourseModel from './models/course';
import * as EnrollmentModel from './models/enrollment';
import * as PaymentModel from './models/payment';
import { query } from './config/db';

async function runTest() {
  console.log("Checking DB Connection...");
  try {
    const res = await query('SELECT NOW()');
    console.log("Database connected successfully:", res.rows[0]);
  } catch (err) {
    console.error("Database connection failed:", err);
    return;
  }

  // Find a student user and a paid course to simulate payment initialization
  try {
    const usersRes = await query('SELECT * FROM users LIMIT 1');
    const coursesRes = await query('SELECT * FROM courses WHERE price > 0 LIMIT 1');

    if (usersRes.rows.length === 0) {
      console.log("No users found in database");
      return;
    }
    if (coursesRes.rows.length === 0) {
      console.log("No paid courses found in database");
      return;
    }

    const user = usersRes.rows[0];
    const course = coursesRes.rows[0];
    console.log(`Simulating payment init for user: ${user.email} (ID: ${user.id}) on course: "${course.title}" (ID: ${course.id})`);

    const provider = 'paystack';
    const currency = 'NGN';
    const reference = `${provider}_${user.id}_${course.id}_${Date.now()}`;

    console.log("Creating payment record...");
    const payment = await PaymentModel.createPayment({
      user_id: user.id,
      course_id: course.id,
      amount: course.price,
      currency,
      provider,
      reference,
    });
    console.log("Payment record created:", payment);

    console.log("Calling Paystack API...");
    console.log("PAYSTACK_SECRET_KEY in process.env is:", process.env.PAYSTACK_SECRET_KEY);
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(payment.amount * 100),
        reference: payment.reference,
        currency: payment.currency,
        callback_url: `${process.env.FRONTEND_URL}/verify-payment`,
        metadata: {
          userId: user.id,
          courseId: course.id,
        }
      })
    });

    const paystackData: any = await response.json();
    console.log("Paystack response:", paystackData);

    if (!paystackData.status) {
       throw new Error(paystackData.message || 'Paystack initialization failed');
    }

    console.log("Authorization URL:", paystackData.data.authorization_url);
    console.log("Test successfully passed!");

  } catch (err) {
    console.error("Test failed with error:", err);
  }
}

runTest();
