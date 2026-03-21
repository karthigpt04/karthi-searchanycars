import morgan from 'morgan'
import config from '../config.js'

export const requestLogger = config.isDev ? morgan('dev') : morgan('combined')
