const { contextBridge, ipcRenderer } = require("electron");

console.log("Preload script is loaded!");

contextBridge.exposeInMainWorld("electron", {
    
    getAudioDevices: () => ipcRenderer.invoke("get-audio-devices"),
    startRecording: () => ipcRenderer.send("start-recording"),
    getPath: () => ipcRenderer.invoke("get-path"),
    onRecordingDone: (callback) => ipcRenderer.on("recording-done", (_, path) => callback(path)),
    onRecordingError: (callback) => ipcRenderer.on("recording-error", (_, error) => callback(error)),

    // onRecordingDone: (callback) => ipcRenderer.on("recording-done", (event, path) => callback(path))
});


