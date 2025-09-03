import React, { useState, useRef, useEffect } from "react";

const MicrophoneTest = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState("");
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  const startMicTest = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Create audio context for level monitoring
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      microphone.connect(analyser);
      analyserRef.current = analyser;

      setIsRecording(true);

      // Start monitoring audio levels
      const monitorAudio = () => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        const average =
          dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setAudioLevel(Math.round((average / 255) * 100));

        if (isRecording) {
          animationRef.current = requestAnimationFrame(monitorAudio);
        }
      };

      monitorAudio();
    } catch (err) {
      console.error("Microphone access error:", err);
      setError("Could not access microphone: " + err.message);
    }
  };

  const stopMicTest = () => {
    setIsRecording(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setAudioLevel(0);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div
      style={{
        padding: "20px",
        border: "2px solid #007bff",
        borderRadius: "10px",
        margin: "20px",
        backgroundColor: "#f8f9fa",
      }}
    >
      <h3>🎤 Microphone Test</h3>
      <p>Test your microphone before joining voice chat</p>

      {error && (
        <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>
      )}

      <div style={{ marginBottom: "15px" }}>
        <button
          onClick={isRecording ? stopMicTest : startMicTest}
          style={{
            padding: "10px 20px",
            backgroundColor: isRecording ? "#dc3545" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          {isRecording ? "🛑 Stop Test" : "🎤 Start Mic Test"}
        </button>
      </div>

      {isRecording && (
        <div>
          <div style={{ marginBottom: "10px" }}>
            <strong>Audio Level: {audioLevel}%</strong>
          </div>
          <div
            style={{
              width: "100%",
              height: "20px",
              backgroundColor: "#e9ecef",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${audioLevel}%`,
                height: "100%",
                backgroundColor:
                  audioLevel > 50
                    ? "#28a745"
                    : audioLevel > 20
                    ? "#ffc107"
                    : "#6c757d",
                transition: "width 0.1s ease",
              }}
            />
          </div>
          <p style={{ marginTop: "10px", fontSize: "14px", color: "#6c757d" }}>
            Speak into your microphone. You should see the bar move when you
            talk.
          </p>
        </div>
      )}
    </div>
  );
};

export default MicrophoneTest;
