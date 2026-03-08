import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'

import { corsOptions } from './config/corsOptions.ts'

import { serverScan } from './controllers/serverScanController.ts'


const app = express();

app.use(cors(corsOptions));
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(cookieParser());

app.use("/api/server-scan", serverScan)

const PORT = process.env.PORT || 3000
app.listen(3000, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
})