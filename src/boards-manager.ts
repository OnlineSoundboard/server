import { type InputBoard, type Board, type BoardOptions } from 'online-soundboard-client'
import crypto from 'node:crypto'

/**
 * Boards manager.
 */
class BoardsManager {
  private readonly _boards: Map<string, Board>

  /**
   * Boards manager constructor.
   */
  constructor () {
    this._boards = new Map<string, Board>()
  }

  /**
   * Adds a board to the manager.
   * @param board the board to add
   */
  public add (board: InputBoard): Board {
    const boardClone: Board = {
      locked: false,
      data: {},
      ...structuredClone(board)
    }
    if (board.auth != null) boardClone.auth = this.hash(boardClone.auth)
    this._boards.set(board.id, boardClone)
    return boardClone
  }

  /**
   * Gets a board from the manager.
   * @param boardId the board id to get
   * @returns the board or null
   */
  public get (boardId: string): Board | null {
    return this._boards.get(boardId) ?? null
  }

  /**
   * Removes a board from the manager.
   * @param boardId the board id to remove
   */
  public remove (boardId: string): Board | null {
    const board = this.get(boardId)
    return this._boards.delete(boardId) ? board : null
  }

  /**
   * Updates a board from the manager.
   * @param boardId the board id to update
   * @param board the new board data
   */
  public update (boardId: string, options: BoardOptions): Board | null {
    const cachedBoard = this.get(boardId)
    if (cachedBoard == null) return null
    if (options.locked != null) cachedBoard.locked = options.locked
    if (options.data != null) cachedBoard.data = options.data
    // disabling auth
    if (options.auth === null) delete cachedBoard.auth
    else if (options.auth !== undefined) cachedBoard.auth = this.hash(options.auth)
    return cachedBoard
  }

  /**
   * Boards in the manager.
   */
  public get boards (): Map<string, Board> {
    return this._boards
  }

  /**
   * Wether the auth is correct.
   * @param boardId the board id
   * @param auth the client auth
   */
  public auth (boardId: string, auth?: string): boolean {
    const board = this._boards.get(boardId)
    if (board == null) return false
    if (board.auth == null) return true
    return auth != null && this.hash(auth) === board.auth
  }

  private hash (data: any): string {
    return crypto.createHash('sha256').update(data).digest('hex')
  }
}

export { BoardsManager }
export default BoardsManager
