# MediSense AI

MediSense AI is a compassionate, professional, and cross-disciplinary medical report and prescription analyzer powered by Google Gemini AI. It translates dense clinical metrics and complex medical jargon into easy-to-understand explanations, tracks wellness habits, lists prescriptions, and flags potential drug-drug interactions.

## Key Features

- **Medical Document & PDF Parsing**: Automatically extract text from clinical reports and prescriptions using Gemini OCR and local PDF text processing.
- **Interactive Health Dashboard**: Track daily vitals (blood pressure, blood glucose, heart rate) alongside symptoms.
- **Medication Scheduler**: Keep track of daily doses and drug usage guidelines.
- **Drug-Drug Interaction Checker**: Analyzes active prescriptions and warns of potential negative interactions or contraindications.
- **Wellness Habit Logger**: Log daily physical routines, hydration, and sleep to understand health progression.
- **Empathetic AI Chatbot**: Chat with an AI medical helper to understand health metrics and receive personalized dietary/lifestyle recommendations.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local]
3. Run the app:
   `npm run dev`
