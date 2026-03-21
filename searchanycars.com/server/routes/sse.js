import { Router } from 'express'

export const sseRouter = Router()

const clients = new Set()

sseRouter.get('/', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })
  res.write('data: {"type":"connected"}\n\n')
  clients.add(res)
  req.on('close', () => clients.delete(res))
})

export const broadcast = (event) => {
  const data = `data: ${JSON.stringify(event)}\n\n`
  for (const client of clients) {
    client.write(data)
  }
}
