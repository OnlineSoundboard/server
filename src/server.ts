/* istanbul ignore file */

import {
  type ClientToServerEvents as ListenEvents,
  type ServerToClientEvents as EmitEvents,
  type ServerSideEvents,
  type SocketData
} from 'online-soundboard-client'
import { Server as ServerIO, type Socket } from 'socket.io'
import debugModule from './debug.js'

import boardHandler from './handlers/board.js'
import soundHandler from './handlers/sound.js'

const debug = debugModule('server')

/* c8 ignore next */
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(/,|;/g).map(o => o.trim())
const port = Number(process.env.PORT ?? 3000)
const io = new ServerIO<ListenEvents, EmitEvents, ServerSideEvents, SocketData>(port, {
  cors: {
    origin: allowedOrigins
  }
})

const onConnection = (socket: Socket<ListenEvents, EmitEvents, ServerSideEvents, SocketData>): void => {
  socket.on('disconnect', (reason: string): void => {
    debug.log(`Socket '${socket.id}' disconnected with reason '${reason}'`)
  })

  socket.on('error', (err: Error): void => {
    debug.error(`${String(err)} from '${socket.id}'`)
  })

  boardHandler(io, socket)
  soundHandler(io, socket)

  debug.log(`Socket '${socket.id}' connected`)
}

io.on('connection', onConnection)

debug.log(`Server listening at ws://localhost:${port}`)

export * from './boards-manager.js'
export { io as server }
export default io
