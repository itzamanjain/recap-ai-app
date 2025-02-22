import { useEffect, useState } from "react";

function App() {
    const [devices, setDevices] = useState([]);
    const [selectedMic, setSelectedMic] = useState("Microphone Array (Realtek(R) Audio)");
    const [selectedSpeaker, setSelectedSpeaker] = useState("Microphone Array (Realtek(R) Audio)");

    useEffect(() => {
        if (window.electron && window.electron.getAudioDevices) {
            window.electron.getAudioDevices()
                .then((deviceList) => {
                    console.log("Fetched Devices: ✨✨✨✨", deviceList); // Debugging
                    // console.log();
                    

                    // Assuming deviceList contains objects with { deviceId, label }
                    setDevices(deviceList.map((device, index) => ({ deviceId: device, label: device })));

                    
                    if (deviceList.length >= 2) {
                      setSelectedSpeaker(deviceList[0]); // ✅ Use the string directly
                      setSelectedMic(deviceList[1]);
                  }
                })
                .catch((err) => console.error("Error fetching audio devices:", err));
        } else {
            console.error("Electron API is not available!");
        }
    }, []);

    const startRecording = () => {
        if (!selectedMic || !selectedSpeaker) {
            alert("Please select both a microphone and a speaker.");
            return;
        }

        window.electron.startRecording({
            speaker: selectedSpeaker,
            mic: selectedMic
        });
    };

    return (
        <div>
            <h1>Meeting Recorder</h1>

            <label>Speaker: </label>
            <select value={selectedSpeaker} onChange={(e) => setSelectedSpeaker(e.target.value)}>
                {devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                        {device.label || "Unknown Device"}
                    </option>
                ))}
            </select>

            <label>Microphone: </label>
            <select value={selectedMic} onChange={(e) => setSelectedMic(e.target.value)}>
                {devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                        {device.label || "Unknown Device"}
                    </option>
                ))}
            </select>

            <button onClick={startRecording}>Start Recording</button>
        </div>
    );
}

export default App;
