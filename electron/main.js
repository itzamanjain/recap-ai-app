const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const ffmpeg = require("ffmpeg-static"); // ✅ Use ffmpeg-static

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 600,
        webPreferences: {
            nodeIntegration: false, // Security best practice
            contextIsolation: true, // ✅ Enables `contextBridge`
            preload: path.join(__dirname, "preload.js"), // ✅ Ensure correct path
        },
    });

    mainWindow.loadURL("http://localhost:5173"); // Adjust based on your React setup

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
});

// Ensure app closes completely when all windows are closed
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// 🔹 Function to auto-detect available audio devices
function getAudioDevices(callback) {
    const ffmpegProcess = spawn(ffmpeg, ["-list_devices", "true", "-f", "dshow", "-i", "dummy"]);

    let output = "";
    ffmpegProcess.stderr.on("data", (data) => {
        output += data.toString();
    });

    ffmpegProcess.on("close", () => {
        const deviceList = [];
        const deviceRegex = /\[dshow\]  "(.*?)"/g;
        let match;

        while ((match = deviceRegex.exec(output)) !== null) {
            deviceList.push(match[1]);
        }
        console.log("device lsit ✨✨✨✨✨✨",deviceList);
        
        if (deviceList.length === 0) {
            console.log("No audio ✨✨✨✨✨ devices detected. Full FFmpeg output:", output);  // Add this to debug
        }

        callback(deviceList);
    });

    ffmpegProcess.on("error", (err) => {
        console.error("FFmpeg Process Error:", err);
        callback([]);  // Return an empty array if there is an error
    });
}


// 🔹 IPC event to send audio device list to frontend
ipcMain.handle("get-audio-devices", async () => {
    return new Promise((resolve) => {
        getAudioDevices(resolve);
    });
});

// 🔹 Start Recording with Auto-Selected Devices
ipcMain.on("start-recording", (event, { speaker, mic }) => {
    const outputPath = path.join(app.getPath("desktop"), "meeting-recording.mp3");

    const ffmpegProcess = spawn(ffmpeg, [
        "-f", "dshow",
        "-i", `audio=${speaker}`,
        "-f", "dshow",
        "-i", `audio=${mic}`,
        "-filter_complex", "[0:a][1:a]amerge=inputs=2[aout]",
        "-map", "[aout]",
        "-ac", "2",
        "-ar", "44100",
        "-y", outputPath,
    ]);

    ffmpegProcess.stderr.on("data", (data) => {
        console.log(`FFmpeg Error: ${data}`);
    });

    ffmpegProcess.on("close", () => {
        event.reply("recording-done", outputPath);
    });

    ffmpegProcess.on("error", (err) => {
        console.error("Recording Process Error:", err);
        event.reply("recording-error", "Recording failed.");
    });
});

