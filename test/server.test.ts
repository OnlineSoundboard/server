import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Client, OSBError, OSBErrorSerialized, Board, Sound } from 'online-soundboard-client'
import { io, Socket } from 'socket.io-client'
import { server } from '../src/server'

const PORT = process.env.PORT || 3000
const SERVER_URL = `ws://localhost:${PORT}`

type TestClient = {
  id: string
  data?: {},
  socket: Socket
}

const clients: TestClient[] = []
const createClient = (): TestClient => {
  const client = {
    get id() { return this.socket?.id },
    socket: io(SERVER_URL),
    data: {}
  }
  clients.push(client)
  return client
}

describe('Server', () => {
  afterAll(() => {
    server.close()
  })

  afterEach(() => {
    clients.forEach(c => c.socket.disconnect())
    clients.splice(0, clients.length)
  })

  it('should get an error', () => {
    const socket = io(SERVER_URL)
    socket.emit('error', new Error('error'))
  })

  describe('board', () => {
    describe(':create', () => {
      it('should create a board', () => new Promise<void>((resolve, reject) => {
        const client = createClient()
        client.socket.emit('board:create', { clientData: client.data }, (err: OSBErrorSerialized, board: Board) => {
          if (err != null) return reject(new OSBError(err))
          expect(typeof board.id).toBe('string')
          resolve()
        })
      }))
      it('should have error when passing wrong args', () => new Promise<void>((resolve, reject) => {
        const client = createClient()
        const args = { clientData: 1, auth: 2 }
        client.socket.emit('board:create', args, (err: OSBErrorSerialized, board: Board) => {
          if (err == null) return reject('was supposed to have an error')
          expect(err.code).toBe(OSBError.Errors.InvalidArguments)
          expect(err.message).toBe(OSBError.Messages[OSBError.Errors.InvalidArguments])
          expect(err.cause).toEqual(args)
          expect(board).toBe(null)
          resolve()
        })
      }))
      it('should not create a new board if still in one', () => new Promise<void>((resolve, reject) => {
        const client = createClient()
        client.socket.emit('board:create', { clientData: client.data, auth: '' }, (err: OSBErrorSerialized, originalBoard: Board) => {
          if (err != null) return reject(new OSBError(err))
          client.socket.emit('board:create', { clientData: client.data, auth: '' }, (err: OSBErrorSerialized, newBoard: Board) => {
            if (err != null) return reject(new OSBError(err))
            expect(newBoard).toEqual(originalBoard)
            resolve()
          })
        })
      }))
      it('should create a board without authentication', () => new Promise<void>((resolve, reject) => {
        const client1 = createClient()
        const client2 = createClient()
        client1.socket.emit('board:create', { clientData: client1.data }, (err: OSBErrorSerialized, board: Board) => {
          if (err != null) return reject(new OSBError(err))
          client2.socket.emit('board:join', { clientData: client1.data, boardId: board.id }, (err: OSBErrorSerialized, joinedBoard: Board) => {
            if (err != null) return reject(new OSBError(err))
            expect(joinedBoard).toEqual(board)
            resolve()
          })
        })
      }))
      it('should create a board with authentication', () => new Promise<void>((resolve, reject) => {
        const auth = 'secret'
        const client = createClient()
        client.socket.emit('board:create', { clientData: client.data, auth }, (err: OSBErrorSerialized, board: Board) => {
          if (err != null) return reject(new OSBError(err))
          expect(board.auth).not.toBe(null)
          resolve()
        })
      }))
    })

    describe(':join', () => {
      it('should emit an error when trying to join an invalid board', () => new Promise<void>((resolve, reject) => {
        const client = createClient()
        client.socket.emit('board:join', { clientData: client.data, boardId: 'wrong' }, (err: OSBErrorSerialized, board: Board) => {
          if (err == null) return reject('was supposed to have an error')
          expect(err.code).toBe(OSBError.Errors.InvalidBoardId)
          expect(err.message).toBe(OSBError.Messages[OSBError.Errors.InvalidBoardId])
          expect(err.cause).toBe('wrong')
          expect(board).toBe(null)
          resolve()
        })
      }))
      it('should emit an error when trying to join no board', () => new Promise<void>((resolve, reject) => {
        const client = createClient()
        const args = { clientData: client.data }
        client.socket.emit('board:join', args, (err: OSBErrorSerialized, board: Board) => {
          if (err == null) return reject('was supposed to have an error')
          expect(err.code).toBe(OSBError.Errors.InvalidArguments)
          expect(err.message).toBe(OSBError.Messages[OSBError.Errors.InvalidArguments])
          expect(err.cause).toEqual(args)
          expect(board).toBe(null)
          resolve()
        })
      }))
      it('should emit an error when auth failed', () => new Promise<void>((resolve, reject) => {
        const auth = 'pwd'
        const wrongAuth = 'wrong'
        const client1 = createClient()
        const client2 = createClient()
        client1.socket.emit('board:create', { clientData: client1.data, auth }, (err: OSBErrorSerialized, board: Board) => {
          if (err != null) return reject(new OSBError(err))
          client2.socket.emit('board:join', { clientData: client2.data, boardId: board.id, auth: wrongAuth }, (err: OSBErrorSerialized, joinedBoard: Board) => {
            if (err == null) return reject('was supposed to have an error')
            expect(err.code).toBe(OSBError.Errors.AuthFailed)
            expect(err.message).toBe(OSBError.Messages[OSBError.Errors.AuthFailed])
            expect(err.cause).toBe(wrongAuth)
            expect(joinedBoard).toBe(null)
            resolve()
          })
        })
      }))
      it('should emit an event when joining a board', () => new Promise<void>((resolve, reject) => {
        const client1 = createClient()
        const client2 = createClient()
        client1.socket.emit('board:create', { clientData: client1.data }, (err: OSBErrorSerialized, board: Board) => {
          if (err != null) return reject(new OSBError(err))
          client2.socket.emit('board:join', { clientData: client2.data, boardId: board.id }, (err: OSBErrorSerialized, joinedBoard: Board) => {
            if (err != null) return reject(new OSBError(err))
            expect(joinedBoard).toEqual(board)
            resolve()
          })
        })
      }))
      it('should return the same board when trying to join the board we are in', () => new Promise<void>((resolve, reject) => {
        const client = createClient()
        client.socket.emit('board:create', { clientData: client.data }, (err: OSBErrorSerialized, board: Board) => {
          if (err != null) return reject(new OSBError(err))
          client.socket.emit('board:join', { clientData: client.data, boardId: board.id }, (err: OSBErrorSerialized, clientBoard: Board) => {
            if (err != null) return reject(new OSBError(err))
            expect(clientBoard).toEqual(board)
            resolve()
          })
        })
      }))
      it('should broadcast an event when joining a board', () => new Promise<void>((resolve, reject) => {
        const client1 = createClient()
        const client2 = createClient()
        client1.socket.once('board:joined', ({ client }) => {
          expect(client).toEqual({ id: client2.id, data: client2.data })
          resolve()
        })
        client1.socket.emit('board:create', { clientData: client1.data }, (err: OSBErrorSerialized, board: Board) => {
          if (err != null) return reject(new OSBError(err))
          client2.socket.emit('board:join', { clientData: client2.data, boardId: board.id }, () => {})
        })
      }))
      it('should emit an error when joining a locked board', () => new Promise<void>((resolve, reject) => {
        const client1 = createClient()
        const client2 = createClient()
        client1.socket.emit('board:create', { clientData: client1.data, locked: true }, (err: OSBErrorSerialized, board: Board) => {
          if (err != null) return reject(new OSBError(err))
          client2.socket.emit('board:join', { clientData: client2.data, boardId: board.id }, (err: OSBErrorSerialized, joinedBoard: Board) => {
            if (err == null) return reject('was supposed to have an error')
            expect(err.code).toBe(OSBError.Errors.BoardLocked)
            expect(err.message).toBe(OSBError.Messages[OSBError.Errors.BoardLocked])
            expect(err.cause).toBe(board.id)
            expect(joinedBoard).toBe(null)
            resolve()
          })
        })
      }))
    })

    describe(':leave', () => {
      it('should emit an event when leaving a board', () => new Promise<void>((resolve, reject) => {
        const client = createClient()
        client.socket.emit('board:create', { clientData: client.data }, (err: OSBErrorSerialized, board: Board) => {
          if (err != null) return reject(new OSBError(err))
          expect(board).not.toBe(null)
          client.socket.emit('board:leave', resolve)
        })
      }))
      it('should not emit an event when leaving board while not in a board', () => new Promise<void>((resolve, reject) => {
        const client = createClient()
        const to = setTimeout(resolve, Client.Timeout)
        client.socket.emit('board:leave', () => {
          clearTimeout(to)
          reject('was not supposed to leave')
        })
      }))
    })

    describe(':update', () => {
      it('should update board data', () => new Promise<void>((resolve, reject) => {
        const boardData = { name: 'board' }
        const client1 = createClient()
        const client2 = createClient()
        client1.socket.emit('board:create', { clientData: client1.data, boardData }, (err: OSBErrorSerialized, board: Board) => {
          if (err != null) return reject(new OSBError(err))
          client2.socket.emit('board:join', { clientData: client2.data, boardId: board.id }, (err: OSBErrorSerialized, joinedBoard: Board) => {
            if (err != null) return reject(new OSBError(err))
            client2.socket.emit('board:update', { options: { ...board, data: boardData } }, (err: OSBErrorSerialized, updatedBoard: Board) => {
              if (err != null) return reject(new OSBError(err))
              expect(joinedBoard).toEqual(board)
              expect(updatedBoard).toEqual({ ...board, data: boardData })
              resolve()
            })
          })
        })
      }))
      it('should remove board auth', () => new Promise<void>((resolve, reject) => {
        const client1 = createClient()
        const client2 = createClient()
        client1.socket.emit('board:create', { clientData: client1.data }, (err: OSBErrorSerialized, board: Board) => {
          if (err != null) return reject(new OSBError(err))
          client2.socket.emit('board:join', { clientData: client2.data, boardId: board.id }, (err: OSBErrorSerialized, joinedBoard: Board) => {
            if (err != null) return reject(new OSBError(err))
            client2.socket.emit('board:update', { options: { ...board, auth: null } }, (err: OSBErrorSerialized, updatedBoard: Board) => {
              if (err != null) return reject(new OSBError(err))
              expect(joinedBoard).toEqual(board)
              expect(updatedBoard).toEqual(board)
              resolve()
            })
          })
        })
      }))
      it('should broadcast an event when updating board data', () => new Promise<void>((resolve, reject) => {
        const boardData = { name: 'board' }
        const client1 = createClient()
        const client2 = createClient()
        client1.socket.once('board:updated', ({ board: updatedBoard }) => {
          expect(updatedBoard.data).toEqual(boardData)
          resolve()
        })
        client1.socket.emit('board:create', { clientData: client1.data, boardData }, (err: OSBErrorSerialized, board: Board) => {
          if (err != null) return reject(new OSBError(err))
          client2.socket.emit('board:join', { clientData: client2.data, boardId: board.id }, (err: OSBErrorSerialized) => {
            if (err != null) return reject(new OSBError(err))
            client2.socket.emit('board:update', { options: { ...board, data: boardData } }, (err: OSBErrorSerialized) => {
              if (err != null) return reject(new OSBError(err))
            })
          })
        })
      }))
      it('should not emit an event when updating board data while not in a board', () => new Promise<void>((resolve, reject) => {
        const client = createClient()
        const to = setTimeout(resolve, Client.Timeout)
        client.socket.once('board:data', () => {
          clearTimeout(to)
          reject('was not supposed to update')
        })
        client.socket.emit('board:data', '')
      }))
      it('should have error when passing wrong args', () => new Promise<void>((resolve, reject) => {
        const args = { options: { locked: 1 } }
        const client1 = createClient()
        const client2 = createClient()
        client1.socket.emit('board:create', { clientData: client1.data }, (err: OSBErrorSerialized, board: Board) => {
          if (err != null) return reject(new OSBError(err))
          client2.socket.emit('board:join', { clientData: client2.data, boardId: board.id }, (err: OSBErrorSerialized) => {
            if (err != null) return reject(new OSBError(err))
            client2.socket.emit('board:update', args, (err: OSBErrorSerialized) => {
              if (err == null) return reject('was supposed to have an error')
              expect(err.code).toBe(OSBError.Errors.InvalidArguments)
              expect(err.message).toBe(OSBError.Messages[OSBError.Errors.InvalidArguments])
              expect(err.cause).toEqual(args)
              resolve()
            })
          })
        })
      }))
    })

    describe(':client', () => {
      describe(':update', () => {
        it('should update client data in a board', () => new Promise<void>((resolve, reject) => {
          const clientData = { name: 'client' }
          const client1 = createClient()
          const client2 = createClient()
          client1.socket.once('board:client:updated', ({ client }) => {
            expect(client).toEqual({ id: client2.id, data: clientData })
            resolve()
          })
          client1.socket.emit('board:create', { clientData: client1.data }, (err: OSBErrorSerialized, board: Board) => {
            if (err != null) return reject(new OSBError(err))
            client2.socket.emit('board:join', { clientData: client2.data, boardId: board.id }, (err: OSBErrorSerialized) => {
              if (err != null) return reject(new OSBError(err))
              client2.socket.emit('board:client:update', { clientData: clientData }, () => {})
            })
          })
        }))
        it('should have error when passing wrong args', () => new Promise<void>((resolve, reject) => {
          const client1 = createClient()
          const client2 = createClient()
          const updatedArgs = { clientData: 'data' }
          client1.socket.emit('board:create', { clientData: client1.data }, (err: OSBErrorSerialized, board: Board) => {
            if (err != null) return reject(new OSBError(err))
            client2.socket.emit('board:join', { clientData: client2.data, boardId: board.id }, (err: OSBErrorSerialized) => {
              if (err != null) return reject(new OSBError(err))
              client2.socket.emit('board:client:update', updatedArgs, (err: OSBErrorSerialized, data: {}) => {
                if (err == null) return reject('was supposed to have an error')
                expect(err.code).toBe(OSBError.Errors.InvalidArguments)
                expect(err.message).toBe(OSBError.Messages[OSBError.Errors.InvalidArguments])
                expect(err.cause).toEqual(updatedArgs)
                expect(data).toBe(null)
                resolve()
              })
            })
          })
        }))
        it('should return the correct data when updating client data', () => new Promise<void>((resolve, reject) => {
          const clientData = { name: 'client' }
          const client1 = createClient()
          const client2 = createClient()
          client1.socket.emit('board:create', { clientData: client1.data }, (err: OSBErrorSerialized, board: Board) => {
            if (err != null) return reject(new OSBError(err))
            client2.socket.emit('board:join', { clientData: client2.data, boardId: board.id }, (err: OSBErrorSerialized) => {
              if (err != null) return reject(new OSBError(err))
              client2.socket.emit('board:client:update', { clientData: clientData }, (err: OSBErrorSerialized, data: {}) => {
                if (err != null) return reject(new OSBError(err))
                expect(data).toEqual(clientData)
                resolve()
              })
            })
          })
        }))
      })
    })
  })

  describe('sound', () => {
    beforeEach(() => new Promise((resolve, reject) => {
      const client1 = createClient()
      const client2 = createClient()
      client1.socket.emit('board:create', { clientData: client1.data }, (err: OSBErrorSerialized, board: Board) => {
        if (err != null) return reject(new OSBError(err))
        client2.socket.emit('board:join', { clientData: client2.data, boardId: board.id }, (err: OSBErrorSerialized) => {
          if (err != null) return reject(new OSBError(err))
          resolve()
        })
      })
    }))

    describe(':play', () => {
      it('should emit an event when playing a sound', () => new Promise<void>((resolve, reject) => {
        const client1 = clients[0]
        const client2 = clients[1]
        const soundId = 'sound_play'
        client2.socket.once('sound:played', ({ soundId: playedSoundId }) => {
          expect(playedSoundId).toBe(soundId)
          resolve()
        })
        client1.socket.emit('sound:play', { soundId }, (err: OSBErrorSerialized) => {
          if (err != null) return reject(new OSBError(err))
        })
      }))
      it('should not emit an event when not in a board', () => new Promise<void>((resolve, reject) => {
        const client = createClient()
        const to = setTimeout(resolve, Client.Timeout)
        client.socket.once('sound:play', () => {
          clearTimeout(to)
          reject('was not supposed to play')
        })
        client.socket.emit('sound:play', { soundId: '' }, (err: OSBErrorSerialized) => {
          if (err != null) return reject(new OSBError(err))
        })
      }))
    })

    describe(':update', () => {
      it('should emit an event when updating a sound', () => new Promise<void>((resolve, reject) => {
        const client1 = clients[0]
        const client2 = clients[1]
        const sound = { id: 'sound_update', buffer: new ArrayBuffer(1), data: { name: 'super-sound' } }
        client2.socket.once('sound:updated', ({ sound: updatedSound }) => {
          expect(updatedSound.data).toEqual(sound.data)
          resolve()
        })
        client1.socket.emit('sound:update', { sound }, (err: OSBErrorSerialized) => {
          if (err != null) return reject(new OSBError(err))
        })
      }))
      it('should not emit an event when not in a board', () => new Promise<void>((resolve, reject) => {
        const client = createClient()
        const to = setTimeout(resolve, Client.Timeout)
        client.socket.once('sound:updated', () => {
          clearTimeout(to)
          reject('was not supposed to update')
        })
        client.socket.emit('sound:update', { sound: {} }, (err: OSBErrorSerialized) => {
          if (err != null) return reject(new OSBError(err))
        })
      }))
      it('should have error when passing wrong args', () => new Promise<void>((resolve, reject) => {
        const client = clients[0]
        const args = { sound: 1 }
        client.socket.emit('sound:update', args, (err: OSBErrorSerialized) => {
          if (err == null) return reject('was supposed to have an error')
          expect(err.code).toBe(OSBError.Errors.InvalidArguments)
          expect(err.message).toBe(OSBError.Messages[OSBError.Errors.InvalidArguments])
          expect(err.cause).toEqual(args)
          resolve()
        })
      }))
    })

    describe(':delete', () => {
      it('should emit an event when deleting a sound', () => new Promise<void>((resolve, reject) => {
        const client1 = clients[0]
        const client2 = clients[1]
        const soundId = 'sound_delete'
        client2.socket.once('sound:deleted', ({ soundId: deletedSoundId }) => {
          expect(deletedSoundId).toBe(soundId)
          resolve()
        })
        client1.socket.emit('sound:delete', { soundId }, (err: OSBErrorSerialized) => {
          if (err != null) return reject(new OSBError(err))
        })
      }))
      it('should not emit an event when not in a board', () => new Promise<void>((resolve, reject) => {
        const client = createClient()
        const to = setTimeout(resolve, Client.Timeout)
        client.socket.once('sound:deleted', () => {
          clearTimeout(to)
          reject('was not supposed to delete')
        })
        client.socket.emit('sound:delete', { soundId: '' }, (err: OSBErrorSerialized) => {
          if (err != null) return reject(new OSBError(err))
        })
      }))
      it('should have error when passing wrong args', () => new Promise<void>((resolve, reject) => {
        const client = clients[0]
        const args = { soundId: 1 }
        client.socket.emit('sound:delete', { soundId: 1 }, (err: OSBErrorSerialized) => {
          if (err == null) return reject('was supposed to have an error')
          expect(err.code).toBe(OSBError.Errors.InvalidArguments)
          expect(err.message).toBe(OSBError.Messages[OSBError.Errors.InvalidArguments])
          expect(err.cause).toEqual(args)
          resolve()
        })
      }))
    })

    describe(':missing', () => {
      it('should emit an event when asking for a sound', () => new Promise<void>((resolve, reject) => {
        const client1 = clients[0]
        const client2 = clients[1]
        const soundId = 'sound_ask'
        client2.socket.once('sound:played', ({ soundId: soundToPlay }) => {
          client1.socket.once('sound:missing', ({ soundId: soundMissing }) => {
            expect(soundId).toBe(soundMissing)
            resolve()
          })
          client2.socket.emit('sound:missing', { soundId: soundToPlay }, (err: OSBErrorSerialized) => {
            if (err != null) return reject(new OSBError(err))
          })
        })
        client1.socket.emit('sound:play', { soundId }, (err: OSBErrorSerialized) => {
          if (err != null) return reject(new OSBError(err))
        })
      }))
      it('should send the sound when asking for a sound', () => new Promise<void>((resolve, reject) => {
        const client1 = clients[0]
        const client2 = clients[1]
        const soundId = 'sound_ask'
        client2.socket.once('sound:played', ({ soundId: soundToPlay }) => {
          client1.socket.once('sound:missing', ({ soundId: soundMissing }, callback) => {
            callback(null, { id: soundMissing })
          })
          client2.socket.emit('sound:missing', { soundId: soundToPlay }, (err: OSBErrorSerialized, sound: Sound) => {
            if (err != null) return reject(new OSBError(err))
            expect(sound).toEqual({ id: soundId })
            resolve()
          })
        })
        client1.socket.emit('sound:play', { soundId }, (err: OSBErrorSerialized) => {
          if (err != null) return reject(new OSBError(err))
        })
      }))
      it('should have error when missing sound is not cached from the sender', () => new Promise<void>((resolve, reject) => {
        const client1 = clients[0]
        const client2 = clients[1]
        const soundId = 'sound_ask'
        client2.socket.once('sound:played', ({ soundId: soundToPlay }) => {
          client1.socket.once('sound:missing', ({ soundId }, callback) => {
            callback(new OSBError(OSBError.Errors.SoundNotCached, soundId), null)
          })
          client2.socket.emit('sound:missing', { soundId: soundToPlay }, (err: OSBErrorSerialized, sound: Sound) => {
            if (err == null) return reject('was not supposed to missing')
            expect(err.code).toBe(OSBError.Errors.SoundNotCached)
            expect(err.message).toBe(OSBError.Messages[OSBError.Errors.SoundNotCached])
            expect(err.cause).toBe(soundId)
            expect(sound).toBe(null)
            resolve()
          })
        })
        client1.socket.emit('sound:play', { soundId }, (err: OSBErrorSerialized) => {
          if (err != null) return reject(new OSBError(err))
        })
      }))
      it('should not emit an event when asking for a sound if no emitter was found', () => new Promise<void>((resolve, reject) => {
        const client = clients[0]
        const soundId = 'sound_missing'
        const to = setTimeout(resolve, Client.Timeout)
        client.socket.once('sound:missing', () => {
          clearTimeout(to)
          reject('was not supposed to missing')
        })
        client.socket.emit('sound:missing', { soundId }, (err: OSBErrorSerialized) => {
          if (err != null) return reject(new OSBError(err))
        })
      }))
      it('should not emit an event when not in a board', () => new Promise<void>((resolve, reject) => {
        const client = createClient()
        const to = setTimeout(resolve, Client.Timeout)
        client.socket.once('sound:missing', () => {
          clearTimeout(to)
          reject('was not supposed to missing')
        })
        client.socket.emit('sound:missing', { soundId: '' }, (err: OSBErrorSerialized) => {
          if (err != null) return reject(new OSBError(err))
        })
      }))
      it('should have error when passing wrong args', () => new Promise<void>((resolve, reject) => {
        const client = clients[0]
        const args = { soundId: 1 }
        client.socket.emit('sound:missing', args, (err: OSBErrorSerialized) => {
          if (err == null) return reject('was supposed to have an error')
          expect(err.code).toBe(OSBError.Errors.InvalidArguments)
          expect(err.message).toBe(OSBError.Messages[OSBError.Errors.InvalidArguments])
          expect(err.cause).toEqual(args)
          resolve()
        })
      }))
    })

    describe(':fetch', () => {
      it('should fetch the sounds of the current board host', () => new Promise<void>((resolve, reject) => {
        const client1 = clients[0]
        const client2 = clients[1]
        const sound = { id: 'sound_fetch', buffer: Buffer.from(new ArrayBuffer(1)) }
        client1.socket.once('sound:fetch', (callback) => {
          callback([sound])
        })
        client2.socket.emit('sound:fetch', (sounds: Sound[]) => {
          expect(sounds.length).toBe(1)
          expect(sounds[0]).toEqual(sound)
          resolve()
        })
      }))
    })
  })
})
