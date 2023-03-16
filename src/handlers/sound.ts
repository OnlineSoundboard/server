import { type RemoteSocket, type Server, type Socket } from 'socket.io'
import {
  OSBError,
  type ClientToServerEvents as ListenEvents,
  type ServerToClientEvents as EmitEvents,
  type ServerSideEvents,
  type SocketData,
  Client,
  type Sound
} from 'online-soundboard-client'
import debugModule from '../debug.js'
import validate from '../validator.js'

const debug = debugModule('sound')

export default function (
  io: Server<ListenEvents, EmitEvents, ServerSideEvents, SocketData>,
  socket: Socket<ListenEvents, EmitEvents, ServerSideEvents, SocketData>
): void {
  socket.on('sound:play', (args) => {
    /* c8 ignore next */
    if (socket.data.board == null) return

    /* c8 ignore next */
    if (socket.data.playedSounds == null) socket.data.playedSounds = {}
    socket.data.playedSounds[args.soundId] = true
    io.in(socket.data.board.id).emit('sound:played', { soundId: args.soundId })
    debug.log(`Socket '${socket.id}' has played sound '${args.soundId}' in '${socket.data.board.id}'`)
  })

  socket.on('sound:update', (args, callback) => {
    /* c8 ignore next */
    if (socket.data.board == null) return

    if (!validate(args, { sound: { id: 'string' } })) return callback?.(new OSBError(OSBError.Errors.InvalidArguments, args))

    io.in(socket.data.board.id).emit('sound:updated', { sound: args.sound })
    debug.log(`Socket '${socket.id}' has updated sound '${args.sound.id}' in '${socket.data.board.id}'`)
    callback?.(null)
  })

  socket.on('sound:delete', (args, callback) => {
    /* c8 ignore next */
    if (socket.data.board == null) return

    if (!validate(args, { soundId: 'string' })) return callback?.(new OSBError(OSBError.Errors.InvalidArguments, args))

    io.in(socket.data.board.id).emit('sound:deleted', { soundId: args.soundId })
    debug.log(`Socket '${socket.id}' has deleted sound '${args.soundId}' in '${socket.data.board.id}'`)
    callback?.(null)
  })

  socket.on('sound:missing', async (args, callback) => {
    /* c8 ignore next */
    if (socket.data.board == null) return

    if (!validate(args, { soundId: 'string' })) return callback?.(new OSBError(OSBError.Errors.InvalidArguments, args), null as any)

    const emitter = await getPlayedSoundSocket(socket.data.board.id, args.soundId)
    if (emitter == null) return
    emitter.emit('sound:missing', { soundId: args.soundId }, (err, sound) => callback?.(err, sound))
    debug.log(`Socket '${socket.id}' has asked for sound '${args.soundId}' from '${emitter.id}' in '${socket.data.board.id}'`)
  })

  socket.on('sound:fetch', async (callback) => {
    /* c8 ignore next */
    if (socket.data.board == null) return

    const client = await io.in(socket.data.board.id).fetchSockets().then((s) => s[0])
    const sounds = await new Promise<Sound[]>((resolve, reject) => {
      const to = setTimeout(() => reject(new OSBError(OSBError.Errors.Timeout)), Client.Timeout)
      client.emit('sound:fetch', (sounds) => {
        clearTimeout(to)
        resolve(sounds)
      })
    })
    callback?.(sounds)
    debug.log(`Socket '${socket.id}' has asked for sounds list from '${socket.data.board.id}'`)
  })

  const getPlayedSoundSocket = async (boardId: string, soundId: string): Promise<RemoteSocket<EmitEvents, SocketData> | null> => {
    const sockets = await io.in(boardId).fetchSockets()
    return sockets.find(s => s.data.playedSounds?.[soundId] != null) ?? null
  }
}
