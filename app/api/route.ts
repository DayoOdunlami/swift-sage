import Groq from "groq-sdk";
import { headers } from "next/headers";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { after } from "next/server";
import { tools } from "../../lib/tools";
import { createTask, listTasks } from "../../lib/todoist";

const groq = new Groq();

const schema = zfd.formData({
	input: z.union([zfd.text(), zfd.file()]),
	message: zfd.repeatableOfType(
		zfd.json(
			z.object({
				role: z.enum(["user", "assistant", "tool"]),
				content: z.string().optional(),
				tool_calls: z.array(z.any()).optional(),
				tool_call_id: z.string().optional(),
				name: z.string().optional(),
			})
		)
	),
});

export async function POST(request: Request) {
	console.time("transcribe " + request.headers.get("x-vercel-id") || "local");

	const { data, success } = schema.safeParse(await request.formData());
	if (!success) return new Response("Invalid request", { status: 400 });

	const transcript = await getTranscript(data.input);
	if (!transcript) return new Response("Invalid audio", { status: 400 });

	console.timeEnd(
		"transcribe " + request.headers.get("x-vercel-id") || "local"
	);
	console.time(
		"ai processing " + request.headers.get("x-vercel-id") || "local"
	);

	const initialMessages = data.message.length
		? data.message
		: [{ role: "user", content: transcript }];

	const systemPrompt = `You are Swift Sage, a smart AI assistant for managing Todoist tasks. You can use tools to help the user. If the user asks to list/show/find tasks, use list_tasks. If they ask to create/add a task, use create_task. Always respond with a thoughtful, conversational message based on the tool's output. If a tool fails or returns no results, tell the user in a helpful, apologetic way.`;

	let messages: any[] = [
		{ role: "system", content: systemPrompt },
		...initialMessages,
	];

	if (data.message.length > 0) {
		messages.push({ role: "user", content: transcript });
	}

	// --- AI Orchestration Logic ---
	const initialResponse = await groq.chat.completions.create({
		model: "llama3-8b-8192",
		messages,
		tools: tools,
	});

	const { message: responseMessage } = initialResponse.choices[0];
	messages.push(responseMessage);

	let finalMessageContent = "";

	if (responseMessage.tool_calls) {
		for (const toolCall of responseMessage.tool_calls) {
			const functionName = toolCall.function.name;
			const functionArgs = JSON.parse(toolCall.function.arguments);
			let toolResponse = null;

			try {
				if (functionName === "list_tasks") {
					toolResponse = await listTasks(functionArgs.filter);
				} else if (functionName === "create_task") {
					toolResponse = await createTask(functionArgs);
				}

				messages.push({
					tool_call_id: toolCall.id,
					role: "tool",
					name: functionName,
					content: JSON.stringify(toolResponse),
				});
			} catch (error) {
				messages.push({
					tool_call_id: toolCall.id,
					role: "tool",
					name: functionName,
					content: JSON.stringify({ error: "Tool execution failed." }),
				});
			}
		}

		const secondResponse = await groq.chat.completions.create({
			model: "llama3-8b-8192",
			messages,
		});
		finalMessageContent = secondResponse.choices[0].message.content || "I'm not sure how to respond to that.";
	} else {
		finalMessageContent = responseMessage.content || "I'm sorry, I'm not sure how to help with that.";
	}

	console.timeEnd(
		"ai processing " + request.headers.get("x-vercel-id") || "local"
	);

	if (!finalMessageContent) return new Response("Invalid response", { status: 500 });

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
			transcript: finalMessageContent,
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
			"X-Response": encodeURIComponent(finalMessageContent),
			"Content-Type": "application/octet-stream",
		},
	});
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
	if (typeof input === "string") return input.trim() || null;

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
