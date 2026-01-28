import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import AppError from '../utils/appError.js';
import sendEmail from '../utils/email.js';
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
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.jwt) {
    token = req.cookie;
  }

  if (!token) {
    next(new AppError('protected route, please login to continue'));
  }

  try {
    const decode = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);

    const user = await User.findById(decode.id);

    if (!user) {
      return next(new AppError('The user does not exist', 400));
    }

    if (user.changePasswordAfter(decode.iat)) {
      return next(
        new AppError(
          'User recently changed password! please log in agin.',
          401,
        ),
      );
    }

    req.user = user;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token has expired, please login again', 403));
    }

    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid Token', 403));
    }

    return next(new AppError(err, 403));
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

    await user.save({ validateBeforeSave: false });

    const resetURL = `${req.protocol}://${req.get('host')}/api/users/resetPassword/${resetToken}`;

    const message = `Forgot your password? Submit a PATH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ingore this email`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Your password reset token (valid only for 10 mins)',
        message,
      });
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
