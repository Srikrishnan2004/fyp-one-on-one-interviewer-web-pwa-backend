import { exec } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { promises as fs } from "fs";
import OllamaService from "./ollama/index.js";
import app from "./app.js";
import { closePool } from "./config/database.js";
dotenv.config();

// Path to your Piper TTS Python script and default model
const piperScript = "piper_tts.py";
const piperModel = "models/en_US-amy-medium.onnx";

const port = process.env.PORT || 3000;

// Initialize Ollama service
const ollamaService = new OllamaService();

// Add existing interview functionality to the app
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

// Interview API endpoints
app.get("/interview/templates", (req, res) => {
  try {
    const templates = ollamaService.getAvailableTemplates();
    res.json({
      success: true,
      templates,
      count: templates.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch templates",
      message: error.message
    });
  }
});

app.get("/interview/templates/search", (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({
        success: false,
        error: "Search query parameter 'q' is required"
      });
    }
    
    const templates = ollamaService.searchTemplates(q);
    res.json({
      success: true,
      templates,
      count: templates.length,
      query: q
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to search templates",
      message: error.message
    });
  }
});

app.get("/interview/templates/stats", (req, res) => {
  try {
    const stats = ollamaService.getTemplateStatistics();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get template statistics",
      message: error.message
    });
  }
});

app.post("/interview/generate", async (req, res) => {
  try {
    const { template, context, includeAudio = true } = req.body;
    
    if (!template) {
      return res.status(400).json({
        success: false,
        error: "Template key is required",
        example: "languages.java"
      });
    }
    
    const questions = await ollamaService.generateInterviewQuestions(template, context);
    
    // Process each question to add audio and animation properties
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      if (includeAudio) {
        const timestamp = Date.now();
        const baseFileName = `interview_${i}_${timestamp}`;
        const fileName = `audios/${baseFileName}.wav`;
        
        try {
          // Generate audio file using Piper TTS
          await piperTTS(question.text, piperModel, fileName);
          // Generate lipsync
          await lipSyncMessage(baseFileName);
          
          // Add audio properties
          question.audio = await audioFileToBase64(fileName);
          question.lipsync = await readJsonTranscript(`audios/${baseFileName}.json`);
        } catch (audioError) {
          console.error(`Failed to generate audio for question ${i}:`, audioError);
          question.audio = null;
          question.lipsync = null;
        }
      } else {
        // Add default audio properties when audio is not generated
        question.audio = null;
        question.lipsync = null;
      }
      
      // Always add facial expression and animation properties
      question.facialExpression = getFacialExpressionForDifficulty(question.difficulty);
      question.animation = getAnimationForQuestionType(question.category);
    }
    
    res.json({
      success: true,
      template,
      questions,
      count: questions.length,
      audioGenerated: includeAudio
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to generate interview questions",
      message: error.message
    });
  }
});

// Resume-specific endpoints
app.post("/interview/resume/analyze", async (req, res) => {
  try {
    const { resumeContent, template = "resume.general", includeAudio = true } = req.body;
    
    if (!resumeContent) {
      return res.status(400).json({
        success: false,
        error: "Resume content is required",
        example: "Provide resume text content"
      });
    }
    
    // Generate context-aware questions based on resume content
    const context = `Resume Content:\n${resumeContent}\n\nBased on this resume, generate relevant interview questions.`;
    const questions = await ollamaService.generateInterviewQuestions(template, context);
    
    // Process each question to add audio and animation properties
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      if (includeAudio) {
        const timestamp = Date.now();
        const baseFileName = `resume_${i}_${timestamp}`;
        const fileName = `audios/${baseFileName}.wav`;
        
        try {
          // Generate audio file using Piper TTS
          await piperTTS(question.text, piperModel, fileName);
          // Generate lipsync
          await lipSyncMessage(baseFileName);
          
          // Add audio properties
          question.audio = await audioFileToBase64(fileName);
          question.lipsync = await readJsonTranscript(`audios/${baseFileName}.json`);
        } catch (audioError) {
          console.error(`Failed to generate audio for resume question ${i}:`, audioError);
          question.audio = null;
          question.lipsync = null;
        }
      } else {
        // Add default audio properties when audio is not generated
        question.audio = null;
        question.lipsync = null;
      }
      
      // Always add facial expression and animation properties
      question.facialExpression = getFacialExpressionForDifficulty(question.difficulty);
      question.animation = getAnimationForQuestionType(question.category);
    }
    
    res.json({
      success: true,
      template,
      questions,
      count: questions.length,
      resumeAnalyzed: true,
      audioGenerated: includeAudio
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to analyze resume and generate questions",
      message: error.message
    });
  }
});

app.get("/interview/resume/templates", (req, res) => {
  try {
    const resumeTemplates = ollamaService.searchTemplates("resume");
    res.json({
      success: true,
      templates: resumeTemplates,
      count: resumeTemplates.length,
      description: "Resume-specific interview templates"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch resume templates",
      message: error.message
    });
  }
});

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

// Helper function to determine facial expression based on question difficulty
const getFacialExpressionForDifficulty = (difficulty) => {
  switch (difficulty) {
    case "beginner":
      return "smile";
    case "intermediate":
      return "default";
    case "advanced":
      return "serious";
    default:
      return "default";
  }
};

// Helper function to determine animation based on question category
const getAnimationForQuestionType = (category) => {
  const categoryAnimationMap = {
    "Technical": "Talking_1",
    "Behavioral": "Talking_2", 
    "Leadership": "Talking_1",
    "Problem-solving": "Thinking",
    "System Design": "Explaining",
    "Coding": "Talking_1",
    "Database": "Talking_2",
    "Framework": "Talking_1",
    "General": "Talking_1"
  };
  
  return categoryAnimationMap[category] || "Talking_1";
};

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

const lipSyncMessage = async (baseFileName) => {
  const time = new Date().getTime();
  console.log(`Starting lip sync for message ${baseFileName}`);
  // Since Piper TTS already generates WAV files, we can skip the MP3 to WAV conversion
  await execCommand(
    `"C:\\Program Files\\Rhubarb-Lip-Sync-1.14.0-Windows\\rhubarb.exe" -f json -o audios/${baseFileName}.json audios/${baseFileName}.wav -r phonetic`
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
          text: "Hello! Welcome to your AI interview session. I'm here to help you practice and improve your interview skills.",
          audio: await audioFileToBase64("audios/intro_0.wav"),
          lipsync: await readJsonTranscript("audios/intro_0.json"),
          facialExpression: "smile",
          animation: "Talking_1",
        },
        {
          text: "Let's get started! What technology or role would you like to practice for today?",
          audio: await audioFileToBase64("audios/intro_1.wav"),
          lipsync: await readJsonTranscript("audios/intro_1.json"),
          facialExpression: "default",
          animation: "Talking_2",
        },
      ],
    });
    return;
  }


  // Generate response using Ollama service
  const messages = await ollamaService.generateResponse(userMessage);
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    // generate audio file using Piper TTS
    const baseFileName = `message_${i}`;
    const fileName = `audios/${baseFileName}.wav`;
    const textInput = message.text;
    await piperTTS(textInput, piperModel, fileName);
    // generate lipsync
    await lipSyncMessage(baseFileName);
    message.audio = await audioFileToBase64(fileName);
    message.lipsync = await readJsonTranscript(`audios/${baseFileName}.json`);
  }

  res.send({ messages });
});

// Utility functions for audio processing
const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`Virtual AI Interviewer Backend listening on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`API Documentation: http://localhost:${port}/api`);
});
