import { useState, useRef } from 'react'
import { startSession, endSession, heartbeat } from '../api/sessions'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function SessionTimer({ onQualified, onTick }) {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const sessionIdRef = useRef(null)
  const elapsedRef = useRef(0)
  const tickRef = useRef(null)
  const heartbeatRef = useRef(null)

  const handleStart = async () => {
    const { sessionId } = await startSession()
    sessionIdRef.current = sessionId
    elapsedRef.current = 0
    setElapsed(0)
    setRunning(true)

    tickRef.current = setInterval(() => {
      elapsedRef.current += 1
      setElapsed(elapsedRef.current)
      onTick?.(elapsedRef.current)
    }, 1000)

    heartbeatRef.current = setInterval(() => {
      heartbeat(sessionIdRef.current)
    }, 30000)
  }

  const handleStop = async () => {
    clearInterval(tickRef.current)
    clearInterval(heartbeatRef.current)
    setRunning(false)
    const result = await endSession(sessionIdRef.current)
    if (result.qualifying) {
      onQualified(result.item)
    }
  }

  return (
    // Edit: wrap in a styled container — change className here for timer layout
    <div className="session-timer">
      {/* Edit: change the tag or className to style the elapsed time display */}
      <span className="session-timer__elapsed">{formatTime(elapsed)}</span>
      {!running ? (
        // Edit: change button text or className to style the start button
        <button onClick={handleStart}>Start</button>
      ) : (
        // Edit: change button text or className to style the stop button
        <button onClick={handleStop}>Stop</button>
      )}
    </div>
  )
}