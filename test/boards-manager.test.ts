import { describe, expect, it } from 'vitest'
import { Board, InputBoard } from 'online-soundboard-client'
import { BoardsManager } from '../src/boards-manager'
import crypto from 'node:crypto'

const bm = new BoardsManager()
const boardProps: Board = {
  id: '',
  data: {},
  locked: false
}
const toBoard = (board: InputBoard, boardAttrs?: Partial<InputBoard>) => {
  return { ...boardProps, ...board, ...boardAttrs }
}

const hash = (data: any) => crypto.createHash('sha256').update(data).digest('hex')

describe('BoardsManager', () => {
  describe('new', () => {
    it('should create an instance', () => {
      const bm = new BoardsManager()
      expect(bm.boards.size).toBe(0)
    })
  })

  describe('#add()', () => {
    it('should add a board', () => {
      const board = { id: 'board_add' }
      expect(bm.add(board)).toEqual(toBoard(board))
      expect(bm.boards.get(board.id)).toEqual(toBoard(board))
    })
  })

  describe('#get()', () => {
    it('should get a board', () => {
      const board = { id: 'board_get' }
      expect(bm.add(board)).toEqual(toBoard(board))
      expect(bm.get(board.id)).toEqual(toBoard(board))
    })
  })

  describe('#remove()', () => {
    it('should remove a board', () => {
      const board = { id: 'board_remove' }
      expect(bm.add(board)).toEqual(toBoard(board))
      expect(bm.get(board.id)).toEqual(toBoard(board))
      expect(bm.remove(board.id)).toEqual(toBoard(board))
      expect(bm.get(board.id)).toBe(null)
    })
    it('should not remove an unknown board', () => {
      expect(bm.remove('board_not_remove')).toBe(null)
    })
  })

  describe('#update()', () => {
    it('should update a board', () => {
      const board = { id: 'board_update', locked: false }
      const updatedBoard1 = { ...board, locked: true, data: { name: 'board' } }
      const updatedBoard2 = { ...updatedBoard1, auth: 'auth' }
      expect(bm.add(board)).toEqual(toBoard(board))
      expect(bm.get(board.id)).toEqual(toBoard(board))
      expect(bm.update(board.id, updatedBoard1)).toEqual(toBoard(updatedBoard1))
      expect(bm.get(board.id)).toEqual(toBoard(updatedBoard1))
      expect(bm.update(board.id, toBoard(updatedBoard2))).toEqual(toBoard(updatedBoard2, { auth: hash(updatedBoard2.auth) }))
      expect(bm.get(board.id)).toEqual(toBoard(updatedBoard2, { auth: hash(updatedBoard2.auth) }))
    })
    it('should not update an unknown board', () => {
      // @ts-expect-error
      expect(bm.update('board_not_update')).toBe(null)
    })
  })

  describe('#boards', () => {
    it('should get all boards', () => {
      const bm = new BoardsManager()
      const board1 = { id: 'board_boards1' }
      const board2 = { id: 'board_boards2' }
      expect(bm.add(board1)).toEqual(toBoard(board1))
      expect(bm.add(board2)).toEqual(toBoard(board2))
      expect(bm.boards).toEqual(new Map([
        [board1.id, toBoard(board1)],
        [board2.id, toBoard(board2)]
      ]))
    })
  })

  describe('#auth()', () => {
    it('should check if client auth is correct', async () => {
      const board1 = { id: 'board_auth', auth: 'secret' }
      const board2 = { id: 'board_auth_null', auth: null }
      expect(bm.add(board1)).toEqual(toBoard(board1, { auth: hash(board1.auth) }))
      expect(bm.add(board2)).toEqual(toBoard(board2))
      expect(bm.auth(board1.id, board1.auth)).toBe(true)
      // @ts-expect-error
      expect(bm.auth(board1.id, null)).toBe(false)
      expect(bm.auth(board1.id)).toBe(false)
      expect(bm.auth('unknown_board')).toBe(false)
      expect(bm.auth(board2.id)).toBe(true)
    })
  })
})
