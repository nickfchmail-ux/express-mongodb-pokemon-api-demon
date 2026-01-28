import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import AppError from '../utils/appError.js';
const router = express.Router();

router.route('/').post(async (req, res, next) => {
  try {
    const refreshToken = req.cookies.jwt; // or req.cookies.jwt if you use one cookie

    if (!refreshToken) {
      return next(new AppError('No refresh token provided', 401));
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_TOKEN_SECRET,
    );

    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError('User not found', 401));
    }

    // Optional: Rotate refresh token (best practice)
    const newRefreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' },
    );

    // Issue new short-lived access token
    const newAccessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' },
    );

    // Set new cookies
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ status: 'success', accessToken: newAccessToken }); // or just 204 if frontend doesn't need it
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(
        new AppError('Refresh token expired - please login again', 403),
      );
    }
    return next(new AppError(err, 403));
  }
});

export default router;
