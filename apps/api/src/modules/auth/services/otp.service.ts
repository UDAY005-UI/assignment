import * as bcrypt from 'bcrypt';

export const generateOtp = async () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, 10);
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
  return { otp, otpHash, otpExpiry };
};