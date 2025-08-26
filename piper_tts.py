import wave
import sys
import os
from piper import PiperVoice

def piper_tts_advanced(text, model_path, output_file="output.wav", voice_info="Unknown Voice"):
    """
    Advanced Piper TTS using Python API
    """
    try:
        print(f"Loading the model: {voice_info}")
        voice = PiperVoice.load(model_path)
        
        print("Synthesizing audio...")
        
        audio_data = b""
        sample_rate = 22050
        sample_width = 2
        channels = 1
        
        for audio_chunk in voice.synthesize(text):
            audio_data += audio_chunk.audio_int16_bytes
            if hasattr(audio_chunk, 'sample_rate'):
                sample_rate = audio_chunk.sample_rate
        
        print(f"Generated {len(audio_data)} bytes of audio data")
        print(f"Sample rate: {sample_rate}, Channels: {channels}, Sample width: {sample_width} bytes")
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        with wave.open(output_file, 'wb') as wav_file:
            wav_file.setnchannels(channels)
            wav_file.setsampwidth(sample_width)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_data)
        
        print(f"SUCCESS: Advanced TTS generated: {output_file}")
        return True
        
    except Exception as e:
        print(f"ERROR: Error with advanced method: {e}")
        return False

def main():
    if len(sys.argv) != 4:
        print("Usage: python piper_tts.py <text> <model_path> <output_file>")
        sys.exit(1)
    
    text = sys.argv[1]
    model_path = sys.argv[2]
    output_file = sys.argv[3]
    
    # Extract voice info from model path
    voice_info = os.path.basename(model_path).replace('.onnx', '')
    
    success = piper_tts_advanced(text, model_path, output_file, voice_info)
    
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
