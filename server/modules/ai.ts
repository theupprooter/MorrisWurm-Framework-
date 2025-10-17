import { GoogleGenAI } from '@google/genai';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { ErrorLog } from '../../types/index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isValidIIFE = (code: string | undefined): code is string => {
    if (!code) return false;
    const trimmed = code.trim();
    return (
        (trimmed.startsWith('({') || trimmed.startsWith('(() => {')) &&
        trimmed.endsWith('})')
    );
};

export const generateMutation = async (failureLog: ErrorLog): Promise<string | null> => {
    logger.info('[AI Engine]: Generating adaptive mutation based on failure log...');
    
    if (!process.env.API_KEY) {
        logger.error('[AI Engine]: API_KEY environment variable is not set. Cannot generate mutation.');
        return `({ exploit: { getLastError: () => ({ type: 'ai_fallback', details: 'AI engine offline. API_KEY not set.' }) } })`;
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const promptTemplatePath = path.join(__dirname, '../../prompt.txt');
        const promptTemplate = await fs.readFile(promptTemplatePath, 'utf-8');

        const finalPrompt = promptTemplate.replace(
            '[FAILURE_LOG_JSON]',
            JSON.stringify(failureLog, null, 2)
        );

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: finalPrompt,
        });
        
        const generatedCode = response.text;

        if (isValidIIFE(generatedCode)) {
            logger.info(`[AI Engine]: Successfully generated and validated new mutation payload.`);
            return generatedCode;
        } else {
            logger.error(`[AI Engine]: AI response was not in the expected IIFE format. Response: ${generatedCode}`);
            throw new Error('AI returned malformed code.');
        }

    } catch (error: any) {
        logger.error(`[AI Engine]: Failed to generate mutation. Error: ${error.message}`);
        return null;
    }
};
