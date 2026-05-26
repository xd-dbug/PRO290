import { startSession, endSession, heartbeat } from './sessions'

describe('sessions', () => {
  it.todo('startSession calls POST /api/sessions')
  it.todo('endSession calls POST /api/sessions/:id/end with correct id')
  it.todo('heartbeat calls POST /api/sessions/:id/heartbeat with correct id')
})