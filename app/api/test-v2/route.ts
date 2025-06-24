// @ts-nocheck
// This file is a carbon copy of the main API route for safe tool integration experiments.

import Groq from "groq-sdk";
import { headers } from "next/headers";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { after } from "next/server";
import { tools, createTask, listTasks, completeTask, updateTask, deleteTask, getProjects } from "../../../lib/todoist";

const groq = new Groq();

const schema = zfd.formData({
	input: z.union([zfd.text(), zfd.file()]),
	message: zfd.repeatableOfType(
		zfd.json(
			z.object({
				role: z.enum(["user", "assistant"]),
				content: z.string(),
			})
		)
	),
});

// Map tool names to their functions
const tool_functions = {
	createTask,
	listTasks,
	completeTask,
	updateTask,
	deleteTask,
};

export async function POST(request: Request) {
	console.time("transcribe " + request.headers.get("x-vercel-id") || "local");

	const formData = await request.formData();
	const { data, success } = schema.safeParse(formData);
	if (!success) return new Response("Invalid request", { status: 400 });

	const transcript = await getTranscript(data.input);
	if (!transcript) return new Response("Invalid audio", { status: 400 });

	// ADD: Get provider choice from form data
	const useWebSpeech = formData.get("useWebSpeech") !== "false"; // Default to true (free)

	console.timeEnd(
		"transcribe " + request.headers.get("x-vercel-id") || "local"
	);
	console.time(
		"ai processing " + request.headers.get("x-vercel-id") || "local"
	);

	// Use Groq for AI processing
	let response: string;
	try {
		const completion = await groq.chat.completions.create({
			model: "llama3-8b-8192",
			messages: [
				{
					role: "system",
					content: `You are Swift Sage, a helpful voice assistant with access to the user's Todoist account.

CRITICAL TOOL USAGE RULES:
1. When user asks about "my tasks", "my data", or personal information - ALWAYS use the available tools first
2. NEVER make up fake personal data or tasks
3. If tools fail or return no data, explain the failure clearly: "I couldn't access your Todoist data. Please check manually."
4. NEVER auto-list tasks - ask permission first: "Found X tasks. Would you like me to list them?"
5. Always prefer real data over examples

RESPONSE FORMATTING:
- Keep responses conversational and natural
- Don't mention technical details about API calls
- Focus on the user's actual data and tasks

AVAILABLE TOOLS: createTask, listTasks, completeTask, updateTask, deleteTask, getProjects

When in doubt, use the tools to get real data rather than guessing or making examples.`,
				},
				...data.message,
				{
					role: "user",
					content: transcript,
				},
			],
			tools,
			tool_choice: "auto",
		});

		let final_response = completion.choices[0].message.content;
		const tool_calls = completion.choices[0].message.tool_calls;

		if (tool_calls && tool_calls.length > 0) {
			let tool_results = [];
			
			for (const tool_call of tool_calls) {
				const function_name = tool_call.function.name;
				const function_args = JSON.parse(tool_call.function.arguments);
				
				// Keep existing tool indicators (user said they were fine)
				let tool_indicator = "";
				switch(function_name) {
					case 'listTasks': tool_indicator = "🔍 Checking your Todoist tasks..."; break;
					case 'createTask': tool_indicator = "✅ Creating task in Todoist..."; break;
					case 'completeTask': tool_indicator = "✔️ Completing task in Todoist..."; break;
					case 'updateTask': tool_indicator = "📝 Updating task in Todoist..."; break;
					case 'deleteTask': tool_indicator = "🗑️ Deleting task from Todoist..."; break;
					default: tool_indicator = "🔧 Using Todoist API...";
				}
				
				const result = await tool_functions[function_name](function_args);
				const clean_result = result.replace(/\/tool-use.*?\/tool-use/g, '').trim();
				
				tool_results.push(`${tool_indicator}\n\n📊 **Real Data from Your Todoist:**\n${clean_result}`);
			}
			
			final_response = tool_results.join('\n\n');
		}

		response = final_response || "I'm not sure how to help with that.";
	} catch (error) {
		console.error("AI processing error:", error);
		response = "I'm sorry, I encountered an error processing your request. Please try again.";
	}

	console.timeEnd(
		"ai processing " + request.headers.get("x-vercel-id") || "local"
	);

	if (!response) return new Response("Invalid response", { status: 500 });

	// REPLACE: The entire Cartesia TTS section with provider logic
	if (useWebSpeech) {
		// Web Speech API (free) - return text for browser TTS
		return new Response(response, {
			headers: {
				"Content-Type": "text/plain",
				"X-TTS-Provider": "webspeech",
				"X-Transcript": encodeURIComponent(transcript),
				"X-Response": encodeURIComponent(response),
			},
		});
	} else {
		// Cartesia TTS (paid) - keep existing Cartesia code here
		console.time(
			"cartesia request " + request.headers.get("x-vercel-id") || "local"
		);

		const voice = await fetch("https://api.cartesia.ai/tts/bytes", {
			method: "POST",
			headers: {
				"Cartesia-Version": "2024-06-30",
				"Content-Type": "application/json",
				"X-API-Key": process.env.CARTESIA_API_KEY!,
			},
			body: JSON.stringify({
				model_id: "sonic-english",
				transcript: response,
				voice: {
					mode: "id",
					id: "79a125e8-cd45-4c13-8a67-188112f4dd22",
				},
				output_format: {
					container: "raw",
					encoding: "pcm_f32le",
					sample_rate: 24000,
				},
			}),
		});

		console.timeEnd(
			"cartesia request " + request.headers.get("x-vercel-id") || "local"
		);

		if (!voice.ok) {
			console.error(await voice.text());
			return new Response("Voice synthesis failed", { status: 500 });
		}

		console.time("stream " + request.headers.get("x-vercel-id") || "local");
		after(() => {
			console.timeEnd("stream " + request.headers.get("x-vercel-id") || "local");
		});

		return new Response(voice.body, {
			headers: {
				"X-Transcript": encodeURIComponent(transcript),
				"X-Response": encodeURIComponent(response),
			},
		});
	}
}

async function location() {
	const headersList = await headers();

	const country = headersList.get("x-vercel-ip-country");
	const region = headersList.get("x-vercel-ip-country-region");
	const city = headersList.get("x-vercel-ip-city");

	if (!country || !region || !city) return "unknown";

	return `${city}, ${region}, ${country}`;
}

async function time() {
	const headersList = await headers();
	const timeZone = headersList.get("x-vercel-ip-timezone") || undefined;
	return new Date().toLocaleString("en-US", { timeZone });
}

async function getTranscript(input: string | File) {
	if (typeof input === "string") return input;

	try {
		const { text } = await groq.audio.transcriptions.create({
			file: input,
			model: "whisper-large-v3",
		});

		return text.trim() || null;
	} catch {
		return null; // Empty audio file
	}
} 