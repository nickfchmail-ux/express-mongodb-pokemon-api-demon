import 'dotenv/config';

import cookieParser from 'cookie-parser';
import express from 'express';
import mongoose from 'mongoose';
import globalErrorHandler from './controllers/errorController.js';
import authRouter from './routes/authRoute.js';
import pokemonRouter from './routes/pokemonRoute.js';
import reviewRouter from './routes/reviewRoute.js';
import userRouter from './routes/userRoute.js';
import AppError from './utils/appError.js';\
import helmet from 'helmet';
import compression from 'compression';
import xss from 'xss';
import mongoSanitize from 'express-mongo-sanitize'
console.log('Loaded SUPABASE_URL:', process.env.SUPABASE_URL); // debug line

const DB = process.env.MONGO_DB;

mongoose.connect(DB).then((con) => {
  console.log('DB connection successful!');
});

const app = express();

//for security
app.use(cors());
app.options('*', cors());
app.use(xss());
app.use(compression());
app.use(mongoSanitize());

app.use(express.json());
app.use(cookieParser());
app.use(helmet())
app.use('/api/refresh', authRouter);
app.use('/api/users', userRouter);
app.use('/api/pokemons', pokemonRouter);
app.use('/api/review', reviewRouter);

//error handling if no reaching point is found

app.all('/*path', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

//global error handling middleware
app.use(globalErrorHandler);

const port = 3000;

app.listen(port, () => {
  console.log('the server is listening on port: ', port);
});
