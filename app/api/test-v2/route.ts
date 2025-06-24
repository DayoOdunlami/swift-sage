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
					content: `You are Swift Sage, a smart AI assistant with Todoist task management capabilities.
					You can create, list, complete, update, and delete tasks through voice commands.
					Respond briefly and naturally to voice commands.
					User location is ${await location()}.
					The current time is ${await time()}.`,
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
			for (const tool_call of tool_calls) {
				const function_name = tool_call.function.name;
				const function_args = JSON.parse(tool_call.function.arguments);
				
				if (tool_functions[function_name]) {
					const result = await tool_functions[function_name](function_args);
					final_response = result;
				}
			}
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