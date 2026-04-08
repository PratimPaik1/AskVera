import React, { useEffect } from 'react'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa'

const Dictaphone = ({ setChatInput }) => {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition()

  if (!browserSupportsSpeechRecognition) {
    return <span>Voice input is not supported in this browser.</span>
  }

  useEffect(() => {
    if (!listening && transcript.trim()) {
      setChatInput(transcript.trim())
      resetTranscript()
    }
  }, [listening, transcript, setChatInput, resetTranscript])

  const handleToggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening()
      return
    }
    SpeechRecognition.startListening({ continuous: true })
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleToggleListening}
        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
        title={listening ? 'Stop voice input' : 'Start voice input'}
      >
        {listening ? <FaMicrophone /> :  <FaMicrophoneSlash /> }
      </button>
      {listening ? (
        <span className="text-xs text-emerald-300 flex items-center gap-1">
          Voice
          <span className="animate-pulse">.</span>
          <span className="animate-pulse" style={{ animationDelay: '150ms' }}>
            .
          </span>
          <span className="animate-pulse" style={{ animationDelay: '300ms' }}>
            .
          </span>
        </span>
      ) : (
        <span className="text-xs text-white/70">Mic off</span>
      )}
    </div>
  )
}

export default Dictaphone
