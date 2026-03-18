import { toPng } from 'html-to-image';

const GEMINI_MODEL = 'gemini-2.5-flash-image';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export const ENV_GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export const DEFAULT_STYLIZE_PROMPT =
  'Stylize this to look more professional and snazzy. Tech orientated. Keep all dimensions the same, No clipping.';

export interface StylizeResult {
  imageDataUrl: string;
}

export async function captureCanvasAsBase64(element: HTMLElement): Promise<string> {
  const dataUrl = await toPng(element, {
    quality: 1,
    pixelRatio: 2,
    backgroundColor: undefined,
  });
  // Strip the data URL prefix to get raw base64
  return dataUrl.replace(/^data:image\/png;base64,/, '');
}

export async function stylizeImage(
  base64Image: string,
  prompt: string,
  apiKey: string,
): Promise<StylizeResult> {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/png',
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => null);
    const msg = err?.error?.message || `API error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error('No response from Gemini API');

  for (const part of parts) {
    if (part.inlineData) {
      const mimeType = part.inlineData.mimeType || 'image/png';
      return {
        imageDataUrl: `data:${mimeType};base64,${part.inlineData.data}`,
      };
    }
  }

  throw new Error('No image returned from Gemini API. The model may have refused the request.');
}
