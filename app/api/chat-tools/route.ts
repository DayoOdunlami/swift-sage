import Groq from "groq-sdk";
import { headers } from "next/headers";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { tools, createTask, listTasks } from "../../../lib/todoist";

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
};

export async function POST(request: Request) {
	const { data, success } = schema.safeParse(await request.formData());
	if (!success) return new Response("Invalid request", { status: 400 });

	const transcript = await getTranscript(data.input);
	if (!transcript) return new Response("Invalid input", { status: 400 });

	const messages: Groq.Chat.CompletionCreateParams.Message[] = [
		{
			role: "system",
			content: `You are Swift Sage, a smart AI assistant for managing Todoist tasks.
You can help users create, complete, find, and manage their tasks.
User location is ${await location()}.
The current time is ${await time()}.`,
		},
		...data.message,
		{
			role: "user",
			content: transcript,
		},
	];

	try {
		// Use tool calling with Groq
		const runner = groq.chat.completions.runTools(
			{
				model: "llama3-8b-8192",
				messages,
				tools,
			},
			tool_functions
		);

		const final_response = await runner.finalContent();

		// Return simple text response for testing
		return new Response(final_response || "No response generated", {
			headers: {
				"X-Transcript": encodeURIComponent(transcript),
				"X-Response": encodeURIComponent(final_response || ""),
			},
		});
	} catch (error) {
		console.error("Tool calling error:", error);
		return new Response("Sorry, I encountered an error processing your request.", {
			status: 500,
			headers: {
				"X-Transcript": encodeURIComponent(transcript),
				"X-Response": encodeURIComponent("Error occurred"),
			},
		});
	}
}

// Helper functions
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
		return null;
	}
} 