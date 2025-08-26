import { exec } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { promises as fs } from "fs";
import fetch from "node-fetch";
dotenv.config();


// Path to your Piper TTS Python script and default model
const piperScript = "piper_tts.py";
const piperModel = "models/en_US-amy-medium.onnx";

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});


// Optionally, list available Piper models
import path from "path";
import { readdirSync } from "fs";
app.get("/voices", (req, res) => {
  const modelDir = path.join(process.cwd(), "models");
  const models = readdirSync(modelDir).filter(f => f.endsWith(".onnx"));
  res.send(models);
});

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

const lipSyncMessage = async (message) => {
  const time = new Date().getTime();
  console.log(`Starting lip sync for message ${message}`);
  // Since Piper TTS already generates WAV files, we can skip the MP3 to WAV conversion
  await execCommand(
    `"C:\\Program Files\\Rhubarb-Lip-Sync-1.14.0-Windows\\rhubarb.exe" -f json -o audios/message_${message}.json audios/message_${message}.wav -r phonetic`
  );
  // -r phonetic is faster but less accurate
  console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
};

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    res.send({
      messages: [
        {
          text: "Hey dear... How was your day?",
          audio: await audioFileToBase64("audios/intro_0.wav"),
          lipsync: await readJsonTranscript("audios/intro_0.json"),
          facialExpression: "smile",
          animation: "Talking_1",
        },
        {
          text: "I missed you so much... Please don't go for so long!",
          audio: await audioFileToBase64("audios/intro_1.wav"),
          lipsync: await readJsonTranscript("audios/intro_1.json"),
          facialExpression: "sad",
          animation: "Crying",
        },
      ],
    });
    return;
  }


  // Prepare prompt for Ollama
  const systemPrompt = `You are a virtual girlfriend.\nYou will always reply with a JSON array of messages. With a maximum of 3 messages. Each message has a text, facialExpression, and animation property. Use "default" for facialExpression and "Idle" for animation unless the context specifically calls for something different.`;
  const prompt = `${systemPrompt}\nUser: ${userMessage || "Hello"}`;

  // Call Ollama local LLM
  const ollamaRes = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3", // Change to your preferred model name if needed
      prompt: prompt,
      stream: false
    })
  });
  const ollamaData = await ollamaRes.json();
  let messages;
  try {
    messages = JSON.parse(ollamaData.response);
    if (messages.messages) messages = messages.messages;
  } catch (e) {
    // fallback: return a default message if parsing fails
    messages = [{ text: "Sorry, I couldn't process your request.", facialExpression: "default", animation: "Idle" }];
  }
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    // generate audio file using Piper TTS
    const fileName = `audios/message_${i}.wav`;
    const textInput = message.text;
    await piperTTS(textInput, piperModel, fileName);
    // generate lipsync
    await lipSyncMessage(i);
    message.audio = await audioFileToBase64(fileName);
    message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
  }

// Function to call Piper TTS Python script
async function piperTTS(text, modelPath, outputFile) {
  return new Promise((resolve, reject) => {
    // Escape quotes properly for command line
    const escapedText = text.replace(/"/g, '\\"');
    const command = `python ${piperScript} "${escapedText}" "${modelPath}" "${outputFile}"`;
    console.log(`Executing: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Piper TTS error: ${error.message}`);
        console.error(`Stderr: ${stderr}`);
        reject(error);
      } else {
        console.log(`Piper TTS output: ${stdout}`);
        resolve(stdout);
      }
    });
  });
}

  res.send({ messages });
});

const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};

app.listen(port, () => {
  console.log(`Virtual Girlfriend listening on port ${port}`);
});
