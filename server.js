import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import handler from './api/parse.js'

const app = express()
const PORT = 3001

app.use(express.json())

app.post('/api/parse', (req, res) => handler(req, res))

const server = createServer(app)
server.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
