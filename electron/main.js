const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const ffmpeg = require("ffmpeg-static");

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js"),
        },
    });

    mainWindow.loadURL("http://localhost:5173");

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

function getAudioDevices(callback) {
    // Check if we're on Windows, as dshow is Windows-specific
    if (process.platform !== 'win32') {
        console.error("❌ This feature is currently only supported on Windows");
        callback({ microphones: [], speakers: [] });
        return;
    }

    const ffmpegProcess = spawn(ffmpeg, [
        "-list_devices", "true",
        "-f", "dshow",
        "-i", "dummy"
    ]);

    let output = "";
    let devices = {
        microphones: [],
        speakers: []
    };
    let isAudioSection = false;

    ffmpegProcess.stderr.on("data", (data) => {
        const chunk = data.toString();
        output += chunk;
        console.log("Raw FFmpeg output chunk:", chunk); // Debug raw output
        
        // Process the output line by line
        const lines = chunk.split('\n');
        lines.forEach(line => {
            // Debug each line
            if (line.trim()) {
                console.log("Processing line:", line);
            }

            // Mark when we enter the audio devices section
            if (line.includes("DirectShow audio devices")) {
                console.log("🎤 ***** FOUND AUDIO DEVICES SECTION *****");
                isAudioSection = true;
            }

            // Only process lines when we're in the audio section
            if (isAudioSection) {
                // Look for alternative device indicators
                if (line.includes('"')) {
                    console.log("Found potential device line:", line);
                    
                    // Try to extract device name between quotes
                    const nameMatch = line.match(/"([^"]+)"/);
                    if (nameMatch) {
                        const deviceName = nameMatch[1];
                        console.log("Extracted device name:", deviceName);

                        // Determine if it's an input or output device
                        const lineLC = line.toLowerCase();
                        const isInput = lineLC.includes("input") || 
                                      lineLC.includes("microphone") || 
                                      lineLC.includes("mic") ||
                                      lineLC.includes("audio input");
                        
                        const isOutput = lineLC.includes("output") || 
                                       lineLC.includes("speaker") || 
                                       lineLC.includes("playback") ||
                                       lineLC.includes("audio output");

                        if (isInput && !devices.microphones.includes(deviceName)) {
                            console.log(`Found microphone: ${deviceName}`);
                            devices.microphones.push(deviceName);
                        } else if (isOutput && !devices.speakers.includes(deviceName)) {
                            console.log(`Found speaker: ${deviceName}`);
                            devices.speakers.push(deviceName);
                        } else {
                            console.log(`Device type unclear - Line indicators: Input=${isInput}, Output=${isOutput}`);
                        }
                    }
                }
            }
        });
    });

    ffmpegProcess.on("close", (code) => {
        console.log(`\n⭐⭐⭐ AUDIO DEVICES DETECTED (Exit code: ${code}) ⭐⭐⭐`);
        console.log("\n🎤 Microphones:", devices.microphones.length);
        devices.microphones.forEach(mic => console.log(`   * ${mic}`));
        console.log("\n🔊 Speakers:", devices.speakers.length);
        devices.speakers.forEach(speaker => console.log(`   * ${speaker}`));
        console.log("\n⭐⭐⭐ END OF DEVICE LIST ⭐⭐⭐\n");

        if (devices.microphones.length === 0 && devices.speakers.length === 0) {
            console.log("❌ No audio devices detected!");
            console.log("Complete FFmpeg output:", output);
        }

        callback(devices);
    });

    ffmpegProcess.on("error", (err) => {
        console.error("⚠️ FFmpeg Process Error:", err);
        console.error(err.stack);
        callback({ microphones: [], speakers: [] });
    });

    // Set a timeout in case FFmpeg hangs
    setTimeout(() => {
        try {
            ffmpegProcess.kill();
            console.error("⚠️ FFmpeg process timed out");
            callback({ microphones: [], speakers: [] });
        } catch (err) {
            console.error("Error killing FFmpeg process:", err);
        }
    }, 10000); // 10 second timeout
}

ipcMain.handle("get-audio-devices", async () => {
    return new Promise((resolve) => {
        getAudioDevices(resolve);
    });
});

ipcMain.on("start-recording", (event, { speaker, mic }) => {
    if (!speaker || !mic) {
        event.reply("recording-error", "Invalid device selection");
        return;
    }

    // Check if we're on Windows
    if (process.platform !== 'win32') {
        event.reply("recording-error", "Recording is only supported on Windows");
        return;
    }

    const outputPath = path.join(app.getPath("desktop"), "meeting-recording.mp3");
    console.log(`Starting recording with mic: ${mic} and speaker: ${speaker}`);
    console.log(`Output path: ${outputPath}`);

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
        const message = data.toString();
        console.log(`FFmpeg Output: ${message}`);
        
        // Check for common errors
        if (message.includes("Could not open audio device") ||
            message.includes("Device not found") ||
            message.includes("Error opening input")) {
            ffmpegProcess.kill();
            event.reply("recording-error", "Failed to access audio devices. Please check your device selection.");
        }
    });

    ffmpegProcess.on("close", (code) => {
        if (code === 0) {
            console.log("Recording completed successfully");
            event.reply("recording-done", outputPath);
        } else {
            console.error(`Recording process exited with code ${code}`);
            event.reply("recording-error", `Recording failed with exit code ${code}`);
        }
    });

    ffmpegProcess.on("error", (err) => {
        console.error("Recording Process Error:", err);
        console.error(err.stack);
        event.reply("recording-error", "Recording failed due to an internal error.");
    });

    // Set a timeout in case FFmpeg hangs
    setTimeout(() => {
        try {
            ffmpegProcess.kill();
            event.reply("recording-error", "Recording timed out");
        } catch (err) {
            console.error("Error killing FFmpeg process:", err);
        }
    }, 3600000); // 1 hour timeout for recording
});