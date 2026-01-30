import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import AppError from '../utils/appError.js';
import { default as Email } from '../utils/email.js';

function generateAccessToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN,
  });
}

function generateRefreshToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN,
  });
}

export async function signUp(req, res, next) {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        status: 'fail',
        message:
          'Request body is missing or empty – make sure you send JSON with Content-Type: application/json',
      });
    }

    const { name, email, password, passwordConfirm } = req.body;

    // Optional: add quick check
    if (!name || !email || !password || password !== passwordConfirm) {
      return res.status(400).json({
        status: 'fail',
        message: 'Missing fields or passwords do not match',
      });
    }

    const newUser = await User.create({
      name,
      email,
      password,
      passwordConfirm,
    });
    const url = `${req.protocol}://${req.get('host')}/me`;
    await new Email(newUser, url).sendWelcome();
    return res.status(201).json({
      status: 'success',
      data: { user: newUser },
    });
  } catch (error) {
    next(new AppError(error, 400));
  }
}

export async function signIn(req, res, next) {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        status: 'fail',
        message:
          'Request body is missing or empty. Send JSON with email and password.',
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password',
      });
    }

    user.password = undefined;
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.cookie('jwt', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: process.env.JWT_MAXAGE,
    });

    return res.status(200).json({
      status: 'success',
      accessToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function protect(req, res, next) {
  console.log('Protect middleware reached'); // better debug message

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt; // ← fixed: was req.cookie (missing 's')
  }

  if (!token) {
    return next(
      new AppError('You are not logged in. Please log in to continue.', 401),
    );
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);
    console.log('Token verified for user ID:', decoded.id); // optional debug

    const user = await User.findById(decoded.id);
    console.log('user logged in: ', user);
    if (!user) {
      return next(
        new AppError('The user belonging to this token no longer exists.', 401),
      );
    }

    if (user.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError(
          'User recently changed password! Please log in again.',
          401,
        ),
      );
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message); // helps in Render logs

    if (error.name === 'TokenExpiredError') {
      return next(
        new AppError('Your token has expired. Please log in again.', 401),
      );
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }

    return next(new AppError(error, 401));
  }
}

export function restrictedTo(...role) {
  return (req, res, next) => {
    if (!role.includes(req.user.role)) {
      return next(
        new AppError('you do not have permission to perform this action', 403),
      );
    }

    next();
  };
}

export async function forgotPassword(req, res, next) {
  try {
    const user = await User.findOne({ email: req.body.email });

    const resetToken = user.createPasswordResetToken();
    const resetURL = `${req.protocol}://${req.get('host')}/api/users/resetPassword/${resetToken}`;
    await user.save({ validateBeforeSave: false });

    const message = `Forgot your password? Submit a PATH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ingore this email`;

    try {
      await new Email(user, resetURL).sendPasswordReset();
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;

      await user.save({ validateBeforeSave: false });

      return next(new AppError(err, 500));
    }

    return res
      .status(200)
      .json({ status: 'success', message: 'Token sent to your email' });
  } catch (err) {
    return next(new AppError(err, 400));
  }
}

export async function resetPassword(req, res, next) {
  try {
    console.log('body: ', req.body);
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(new AppError('Token is invalid or expired', 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    //do not turn off the invalidator
    await user.save();

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.cookie('jwt', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: process.env.JWT_MAXAGE,
    });

    return res.status(200).json({
      status: 'success',
      accessToken,
    });
  } catch (err) {
    return next(new AppError(err, 400));
  }
}
