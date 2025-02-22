const { contextBridge, ipcRenderer } = require("electron");

console.log("Preload script is loaded!");

contextBridge.exposeInMainWorld("electron", {
    getAudioDevices: () => ipcRenderer.invoke("get-audio-devices"),
    startRecording: (devices) => ipcRenderer.send("start-recording", devices),
    onRecordingDone: (callback) => ipcRenderer.on("recording-done", (_, path) => callback(path)),
    onRecordingError: (callback) => ipcRenderer.on("recording-error", (_, error) => callback(error))
});

