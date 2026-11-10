import { Resend } from 'resend';

// Validate that the API key is configured
if (!process.env.RESEND_API_KEY) {
    throw new Error(
        'Missing RESEND_API_KEY environment variable. ' +
        'Get your API key from https://resend.com/api-keys',
    );
}

export const resend = new Resend(process.env.RESEND_API_KEY);