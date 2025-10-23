#!/usr/bin/env python3
"""
Local OpenAI Whisper Transcription Script
This script provides local speech-to-text functionality without requiring an API key.
"""

import whisper
import sys
import json
import os
import argparse
from pathlib import Path

def transcribe_audio(file_path, model_name="base", language=None, prompt=None, temperature=0.0):
    """
    Transcribe audio file using local Whisper model
    
    Args:
        file_path (str): Path to audio file
        model_name (str): Whisper model size (tiny, base, small, medium, large)
        language (str): Language code (optional, auto-detect if None)
        prompt (str): Context prompt for better accuracy
        temperature (float): Temperature for sampling (0.0-1.0)
    
    Returns:
        dict: Transcription result with text and metadata
    """
    try:
        # Validate file exists
        if not os.path.exists(file_path):
            return {
                "success": False,
                "error": f"Audio file not found: {file_path}",
                "text": None
            }
        
        # Load Whisper model
        print(f"Loading Whisper model: {model_name}", file=sys.stderr)
        model = whisper.load_model(model_name)
        
        # Prepare transcription options
        transcribe_options = {
            "temperature": temperature,
            "fp16": False  # Use fp32 for better compatibility
        }
        
        if language:
            transcribe_options["language"] = language
        
        if prompt:
            transcribe_options["initial_prompt"] = prompt
        
        # Transcribe audio
        print(f"Transcribing audio file: {file_path}", file=sys.stderr)
        result = model.transcribe(file_path, **transcribe_options)
        
        # Extract text and metadata
        transcription_text = result["text"].strip()
        detected_language = result.get("language", language or "unknown")
        
        print(f"Transcription completed successfully", file=sys.stderr)
        
        return {
            "success": True,
            "text": transcription_text,
            "language": detected_language,
            "model": model_name,
            "metadata": {
                "file_path": file_path,
                "file_size": os.path.getsize(file_path),
                "temperature": temperature,
                "prompt": prompt
            }
        }
        
    except Exception as e:
        error_msg = f"Transcription failed: {str(e)}"
        print(f"Error: {error_msg}", file=sys.stderr)
        return {
            "success": False,
            "error": error_msg,
            "text": None
        }

def get_available_models():
    """Get list of available Whisper models"""
    return ["tiny", "base", "small", "medium", "large"]

def get_supported_languages():
    """Get list of supported language codes"""
    return [
        "af", "am", "ar", "as", "az", "ba", "be", "bg", "bn", "bo", "br", "bs", "ca", "cs", "cy", "da", "de", "el", "en", "es", "et", "eu", "fa", "fi", "fo", "fr", "gl", "gu", "ha", "haw", "he", "hi", "hr", "ht", "hu", "hy", "id", "is", "it", "ja", "jw", "ka", "kk", "km", "kn", "ko", "la", "lb", "ln", "lo", "lt", "lv", "mg", "mi", "mk", "ml", "mn", "mr", "ms", "mt", "my", "ne", "nl", "nn", "no", "oc", "pa", "pl", "ps", "pt", "ro", "ru", "sa", "sd", "si", "sk", "sl", "sn", "so", "sq", "sr", "su", "sv", "sw", "ta", "te", "tg", "th", "tk", "tl", "tr", "tt", "uk", "ur", "uz", "vi", "yi", "yo", "zh"
    ]

def main():
    parser = argparse.ArgumentParser(description="Local OpenAI Whisper Transcription")
    parser.add_argument("file_path", help="Path to audio file")
    parser.add_argument("--model", "-m", default="base", choices=get_available_models(), 
                       help="Whisper model size (default: base)")
    parser.add_argument("--language", "-l", help="Language code (auto-detect if not specified)")
    parser.add_argument("--prompt", "-p", help="Context prompt for better accuracy")
    parser.add_argument("--temperature", "-t", type=float, default=0.0, 
                       help="Temperature for sampling (0.0-1.0, default: 0.0)")
    parser.add_argument("--output-format", "-f", choices=["text", "json"], default="json",
                       help="Output format (default: json)")
    parser.add_argument("--list-models", action="store_true", help="List available models")
    parser.add_argument("--list-languages", action="store_true", help="List supported languages")
    
    args = parser.parse_args()
    
    # Handle list commands
    if args.list_models:
        models = get_available_models()
        if args.output_format == "json":
            print(json.dumps({"models": models}, indent=2))
        else:
            print("Available models:", ", ".join(models))
        return
    
    if args.list_languages:
        languages = get_supported_languages()
        if args.output_format == "json":
            print(json.dumps({"languages": languages}, indent=2))
        else:
            print("Supported languages:", ", ".join(languages))
        return
    
    # Transcribe audio
    result = transcribe_audio(
        file_path=args.file_path,
        model_name=args.model,
        language=args.language,
        prompt=args.prompt,
        temperature=args.temperature
    )
    
    # Output result
    if args.output_format == "json":
        print(json.dumps(result, indent=2))
    else:
        if result["success"]:
            print(result["text"])
        else:
            print(f"Error: {result['error']}", file=sys.stderr)
            sys.exit(1)

if __name__ == "__main__":
    main()
