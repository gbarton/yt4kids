import Pino from 'pino'

const logger = Pino({
  transport: {
    target: 'pino-pretty'
  },
})

export default logger