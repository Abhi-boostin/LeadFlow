import Groq from 'groq-sdk';
import { config } from '../config.js';

let cached: Groq | null = null;

function client(): Groq {
  if (!config.GROQ_API_KEY) {
    throw new Error(
      'GROQ_API_KEY is not configured. Set it in apps/api/.env to enable AI features.',
    );
  }
  if (!cached) {
    cached = new Groq({ apiKey: config.GROQ_API_KEY });
  }
  return cached;
}

export async function summariseText(text: string, systemPrompt: string): Promise<string> {
  const groq = client();
  const completion = await groq.chat.completions.create({
    model: config.GROQ_SUMMARY_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    temperature: 0.3,
    max_tokens: 800,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('Groq returned no content');
  return content.trim();
}

export async function transcribeAudio(
  audio: Buffer,
  filename: string,
): Promise<{ text: string; duration: number }> {
  const groq = client();
  // Groq SDK accepts a Web File / Blob for the file parameter. Wrapping the Buffer
  // in a fresh Uint8Array avoids Node 22's strict Buffer<ArrayBufferLike> typing
  // which is not assignable to BlobPart.
  const file = new File([new Uint8Array(audio)], filename, { type: 'audio/webm' });
  const transcription = await groq.audio.transcriptions.create({
    file,
    model: config.GROQ_TRANSCRIBE_MODEL,
    response_format: 'verbose_json',
    temperature: 0,
  });

  const result = transcription as unknown as { text?: string; duration?: number };
  if (!result.text) throw new Error('Groq returned no transcription');
  return {
    text: result.text.trim(),
    duration: Math.round(result.duration ?? 0),
  };
}

export function isGroqConfigured(): boolean {
  return Boolean(config.GROQ_API_KEY);
}
