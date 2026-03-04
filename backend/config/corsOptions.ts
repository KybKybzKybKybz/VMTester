import { allowedOrigins } from "./allowedOrigins.ts"
import type {CorsOptions} from 'cors'

export const corsOptions: CorsOptions = {
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
        if(allowedOrigins.includes(origin!) || !origin){
            callback(null, true)
        } else {
            callback(new Error("Not allowed by CORS"))
        }
    },
    optionsSuccessStatus: 200,
    credentials: true
}