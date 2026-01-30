import 'dotenv/config';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import globalErrorHandler from './controllers/errorController.js';
import authRouter from './routes/authRoute.js';
import pokemonRouter from './routes/pokemonRoute.js';
import reviewRouter from './routes/reviewRoute.js';
import userRouter from './routes/userRoute.js';
import AppError from './utils/appError.js';


const DB = process.env.MONGO_DB;

mongoose.connect(DB).then((con) => {
  console.log('DB connection successful!');
});

const app = express();

app.use(cors());
app.use(helmet());
app.use(compression());

app.use(express.json());
app.use(cookieParser());

app.use(cookieParser());
app.use('/', express.static('public'));
app.use('/api/refresh', authRouter);
app.use('/api/users', userRouter);
app.use('/api/pokemons', pokemonRouter);
app.use('/api/review', reviewRouter);

//global error handling middleware
app.use(globalErrorHandler);




//error handling if no reaching point is found

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});



const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log('the server is listening on port: ', port);
});
