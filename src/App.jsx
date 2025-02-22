import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [audioDevices, setAudioDevices] = useState({ microphones: [], speakers: [] });
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');
  const [isRecording, setIsRecording] = useState(false);

    useEffect(() => {
    async function fetchDevices() {
    try {
      if (!window.electron || !window.electron.getAudioDevices) {
        console.error("Electron API is not available!");
            return;
        }

      const devices = await window.electron.getAudioDevices();
        console.log('Available devices:', devices); // Debug log
      setAudioDevices(devices);

      // Set default selections if devices are available
      if (devices.microphones.length > 0) {
        setSelectedMic(devices.microphones[0]);
      }
      if (devices.speakers.length > 0) {
        setSelectedSpeaker(devices.speakers[0]);
      }
    } catch (error) {
        console.error('Error fetching audio devices:', error);
    }
    }
    
    fetchDevices();
  }, []);

  const handleStartRecording = () => {
    if (!selectedMic || !selectedSpeaker) {
      alert("Please select both microphone and speaker");
      return;
    }

    try {
      setIsRecording(true);
      window.electron.startRecording({
        mic: selectedMic,
        speaker: selectedSpeaker
      });
    } catch (error) {
      console.error("Failed to start recording:", error);
      setIsRecording(false);
      alert("Failed to start recording. Please try again.");
    }
  };

  useEffect(() => {
    // Set up recording event handlers
    const handleRecordingDone = (path) => {
      setIsRecording(false);
      alert(`Recording saved to: ${path}`);
    };

    const handleRecordingError = (error) => {
      console.error("Recording error:", error);
      setIsRecording(false);
      alert(`Recording failed: ${error}`);
    };

    window.electron.onRecordingDone(handleRecordingDone);
    window.electron.onRecordingError(handleRecordingError);
  }, []);

  return (
    <div className="container">
      <h1>Audio Recorder</h1>

      <div className="device-selection">
        <div className="select-group">
          <label htmlFor="micSelect">Microphone:</label>
          <select
            id="micSelect"
            value={selectedMic}
            onChange={(e) => setSelectedMic(e.target.value)}
          >
            <option value="">Select Microphone</option>
            {audioDevices.microphones.map((mic, index) => (
              <option key={index} value={mic}>
                {mic}
              </option>
            ))}
            </select>
        </div>

        <div className="select-group">
          <label htmlFor="speakerSelect">Speaker:</label>
          <select
            id="speakerSelect"
            value={selectedSpeaker}
            onChange={(e) => setSelectedSpeaker(e.target.value)}
          >
            <option value="">Select Speaker</option>
            {audioDevices.speakers.map((speaker, index) => (
              <option key={index} value={speaker}>
                {speaker}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="controls">
        {!isRecording ? (
          <button
            onClick={handleStartRecording}
            disabled={!selectedMic || !selectedSpeaker}
            className="start-button"
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={handleStopRecording}
            className="stop-button"
          >
            Stop Recording
          </button>
        )}
      </div>
    </div>
    );
}

export default App;
