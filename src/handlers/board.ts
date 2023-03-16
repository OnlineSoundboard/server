import { type Server, type Socket } from 'socket.io'
import { validate as uuidvalid, v4 as uuidv4 } from 'uuid'
import {
  OSBError,
  type ClientToServerEvents as ListenEvents,
  type ServerToClientEvents as EmitEvents,
  type ServerSideEvents,
  type SocketData
} from 'online-soundboard-client'
import debugModule from '../debug.js'
import { BoardsManager } from '../boards-manager.js'
import validate from '../validator.js'

const debug = debugModule('board')
const boardsManager = new BoardsManager()

export default function (
  io: Server<ListenEvents, EmitEvents, ServerSideEvents, SocketData>,
  socket: Socket<ListenEvents, EmitEvents, ServerSideEvents, SocketData>
): void {
  socket.on('board:create', (args, callback) => {
    if (!validate(args, { clientData: {}, auth: 'string?' })) return callback?.(new OSBError(OSBError.Errors.InvalidArguments, args), null as any)

    if (socket.data.board != null) return callback?.(null, socket.data.board)
    socket.data.clientData = args.clientData

    void leaveCurrentBoard()
    const board = boardsManager.add({
      id: uuidv4(),
      auth: args.auth,
      locked: args.locked ?? false,
      data: args.boardData
    })
    socket.data.board = board
    void socket.join(board.id)
    callback?.(null, board)
    debug.log(`Socket '${socket.id}' has created board '${board.id}'`)
  })

  socket.on('board:join', (args, callback) => {
    if (!validate(args, { clientData: {}, boardId: 'string', auth: 'string?' })) return callback?.(new OSBError(OSBError.Errors.InvalidArguments, args), null as any)
    socket.data.clientData = args.clientData

    const board = boardsManager.get(args.boardId)
    if (board != null && socket.data.board?.id === board.id) return callback?.(null, board)
    if (board == null || !uuidvalid(board.id)) {
      const err = new OSBError(OSBError.Errors.InvalidBoardId, args.boardId)
      callback?.(err, null as any)
      debug.error(`${String(err)} from '${socket.id}'`)
      return
    }

    if (board.locked) {
      const err = new OSBError(OSBError.Errors.BoardLocked, args.boardId)
      callback?.(err, null as any)
      debug.warn(`${String(err)} for '${board.id}' from '${socket.id}'`)
      return
    }

    if (!boardsManager.auth(board.id, args.auth)) {
      const err = new OSBError(OSBError.Errors.AuthFailed, args.auth)
      callback?.(err, null as any)
      debug.warn(`${String(err)} for '${board.id}' from '${socket.id}'`)
      return
    }

    void leaveCurrentBoard()
    socket.data.board = board
    void socket.join(board.id)
    callback?.(null, board)
    socket.broadcast.in(board.id).emit('board:joined', { client: { id: socket.id, data: socket.data.clientData } })
    debug.log(`Socket '${socket.id}' has joined board '${board.id}'`)
  })

  socket.on('board:leave', async (callback) => {
    if (await leaveCurrentBoard()) callback?.()
  })

  socket.on('board:update', (args, callback) => {
    /* c8 ignore next */
    if (socket.data.board == null) return

    if (!validate(args.options, { auth: 'string?', locked: 'boolean?' })) return callback?.(new OSBError(OSBError.Errors.InvalidArguments, args), null as any)

    const updatedBoard = boardsManager.update(socket.data.board.id, args.options)
    /* c8 ignore next */
    if (updatedBoard == null) return callback?.(new OSBError(OSBError.Errors.NotInABoard), null as any)
    socket.data.board = updatedBoard
    io.in(socket.data.board.id).emit('board:updated', { board: socket.data.board })
    callback?.(null, socket.data.board)
    debug.log(`Socket '${socket.id}' has updated data in '${socket.data.board.id}'`)
  })

  socket.on('board:client:update', (args, callback) => {
    /* c8 ignore next */
    if (socket.data.board == null) return

    if (!validate(args.clientData, {})) return callback?.(new OSBError(OSBError.Errors.InvalidArguments, args), null as any)

    socket.data.clientData = args.clientData
    socket.broadcast.in(socket.data.board.id).emit('board:client:updated', { client: { id: socket.id, data: socket.data.clientData } })
    callback?.(null, socket.data.clientData)
    debug.log(`Socket '${socket.id}' has updated data in '${socket.data.board.id}'`)
  })

  socket.on('disconnecting', () => { void leaveCurrentBoard() })
  const leaveCurrentBoard = async (sock: Socket<ListenEvents, EmitEvents, ServerSideEvents, SocketData> = socket): Promise<boolean> => {
    if (sock.data.board == null || sock.data.clientData == null) return false

    const boardId = sock.data.board.id
    io.to(boardId).emit('board:left', { client: { id: sock.id, data: sock.data.clientData } })
    const sockets = await io.in(boardId).fetchSockets()
    if (sockets.length <= 1) boardsManager.remove(boardId)
    sock.data.board = undefined
    void socket.leave(boardId)
    debug.log(`Socket '${sock.id}' has left board '${boardId}'`)
    return true
  }
}
