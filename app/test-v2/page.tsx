"use client";

// @ts-nocheck
// This file is a carbon copy of the main page for safe tool integration experiments.

import clsx from "clsx";
import {
	useActionState,
	useEffect,
	useRef,
	useState,
	startTransition,
} from "react";
import { toast } from "sonner";
import { EnterIcon, LoadingIcon } from "@/lib/icons";
import { usePlayer } from "@/lib/usePlayer";
import { track } from "@vercel/analytics";
import { useMicVAD, utils } from "@ricky0123/vad-react";
import Link from "next/link";

type Message = {
	role: "user" | "assistant";
	content: string;
	latency?: number;
};

export default function TestV2() {
	const [input, setInput] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const player = usePlayer();
	const vad = useMicVAD({
		startOnLoad: true,
		onSpeechEnd: (audio: any) => {
			player.stop();
			const wav = utils.encodeWAV(audio);
			const blob = new Blob([wav], { type: "audio/wav" });
			startTransition(() => submit(blob));
			const isFirefox = navigator.userAgent.includes("Firefox");
			if (isFirefox) vad.pause();
		},
		positiveSpeechThreshold: 0.6,
		minSpeechFrames: 4,
	});

	// ADD: Provider state
	const [useWebSpeech, setUseWebSpeech] = useState(true);

	useEffect(() => {
		function keyDown(e: KeyboardEvent) {
			if (e.key === "Enter") return inputRef.current?.focus();
			if (e.key === "Escape") return setInput("");
		}

		window.addEventListener("keydown", keyDown);
		return () => window.removeEventListener("keydown", keyDown);
	});

	const [messages, submit, isPending] = useActionState<
		Array<Message>,
		string | Blob
	>(async (prevMessages: Array<Message>, data: string | Blob) => {
		const formData = new FormData();

		if (typeof data === "string") {
			formData.append("input", data);
			track("Text input");
		} else {
			formData.append("input", data, "audio.wav");
			track("Speech input");
		}

		// ADD: Send provider choice
		formData.append("useWebSpeech", useWebSpeech.toString());

		for (const message of prevMessages) {
			formData.append("message", JSON.stringify(message));
		}

		const submittedAt = Date.now();

		const response = await fetch("/api/test-v2", {
			method: "POST",
			body: formData,
		});

		const transcript = decodeURIComponent(
			response.headers.get("X-Transcript") || ""
		);
		const text = decodeURIComponent(response.headers.get("X-Response") || "");

		if (!response.ok || !transcript || !text) {
			if (response.status === 429) {
				toast.error("Too many requests. Please try again later.");
			} else {
				toast.error((await response.text()) || "An error occurred.");
			}

			return prevMessages;
		}

		// ADD: Handle Web Speech response
		if (response.headers.get("X-TTS-Provider") === "webspeech") {
			if ('speechSynthesis' in window) {
				const utterance = new SpeechSynthesisUtterance(text);
				utterance.rate = 1.0;
				utterance.pitch = 1.0;
				speechSynthesis.speak(utterance);
			}
			setInput(transcript);

			return [
				...prevMessages,
				{
					role: "user",
					content: transcript,
				},
				{
					role: "assistant",
					content: text,
					latency: Date.now() - submittedAt,
				},
			];
		}

		// Continue with existing audio blob handling for Cartesia
		if (!response.body) {
			toast.error("No response body received.");
			return prevMessages;
		}

		const latency = Date.now() - submittedAt;
		player.play(response.body, () => {
			const isFirefox = navigator.userAgent.includes("Firefox");
			if (isFirefox) vad.start();
		});
		setInput(transcript);

		return [
			...prevMessages,
			{
				role: "user",
				content: transcript,
			},
			{
				role: "assistant",
				content: text,
				latency,
			},
		];
	}, []);

	function handleFormSubmit(e: React.FormEvent) {
		e.preventDefault();
		startTransition(() => submit(input));
	}

	return (
		<>
			<title>Swift Sage - Test V2</title>
			<main className="relative flex flex-col items-center justify-between min-h-screen p-4 overflow-hidden bg-white">
				<div style={{ position: 'absolute', top: '20px', left: '20px' }}>
					<Link href="/" style={{ 
						padding: '8px 16px', 
						backgroundColor: '#6c757d', 
						color: 'white', 
						textDecoration: 'none', 
						borderRadius: '5px',
						fontSize: '14px'
					}}>
						← Back to Main
					</Link>
				</div>
				<div style={{ position: 'absolute', top: '20px', right: '20px' }}>
					<Link href="/test" style={{ 
						padding: '10px 20px', 
						backgroundColor: '#007bff', 
						color: 'white', 
						textDecoration: 'none', 
						borderRadius: '5px',
						fontSize: '14px'
					}}>
						Test Tools
					</Link>
				</div>
				<div className="pb-4 min-h-28" />

				{/* ADD: Provider toggle UI */}
				<div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
					<label className="flex items-center">
						<input
							type="checkbox"
							checked={useWebSpeech}
							onChange={(e) => setUseWebSpeech(e.target.checked)}
							className="mr-2"
						/>
						🆓 Use Free Web Speech (uncheck to use Cartesia if you have credits)
					</label>
				</div>

				<div className="w-full max-w-2xl">
					<Messages
						messages={messages}
						isPending={isPending}
						submit={submit}
					/>
				</div>

				<form
					className="rounded-full bg-neutral-200/80 dark:bg-neutral-800/80 flex items-center w-full max-w-3xl border border-transparent hover:border-neutral-300 focus-within:border-neutral-400 hover:focus-within:border-neutral-400 dark:hover:border-neutral-700 dark:focus-within:border-neutral-600 dark:hover:focus-within:border-neutral-600"
					onSubmit={handleFormSubmit}
				>
					<input
						type="text"
						className="bg-transparent focus:outline-hidden p-4 w-full placeholder:text-neutral-600 dark:placeholder:text-neutral-400"
						required
						placeholder="Ask me anything"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						ref={inputRef}
					/>

					<button
						type="submit"
						className="p-4 text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white"
						disabled={isPending}
						aria-label="Submit"
					>
						{isPending ? <LoadingIcon /> : <EnterIcon />}
					</button>
				</form>

				<div className="text-neutral-400 dark:text-neutral-600 pt-4 text-center max-w-xl text-balance min-h-28 space-y-4">
					{messages.length > 0 && (
						<p>
							{messages.at(-1)?.content}
							<span className="text-xs font-mono text-neutral-300 dark:text-neutral-700">
								{" "}
								({messages.at(-1)?.latency}ms)
							</span>
						</p>
					)}

					{messages.length === 0 && (
						<>
							<p>
								A fast, open-source voice assistant powered by{" "}
								<A href="https://groq.com">Groq</A>,{" "}
								<A href="https://cartesia.ai">Cartesia</A>,{" "}
								<A href="https://www.vad.ricky0123.com/">VAD</A>, and{" "}
								<A href="https://vercel.com">Vercel</A>.{" "}
								<A href="https://github.com/ai-ng/swift" target="_blank">
									Learn more
								</A>
								.{" "}
								<A href="/test">Test Tools</A>.
							</p>

							{vad.loading ? (
								<p>Loading speech detection...</p>
							) : vad.errored ? (
								<p>Failed to load speech detection.</p>
							) : (
								<p>Start talking to chat.</p>
							)}
						</>
					)}
				</div>

				<div
					className={clsx(
						"absolute size-36 blur-3xl rounded-full bg-linear-to-b from-red-200 to-red-400 dark:from-red-600 dark:to-red-800 -z-50 transition ease-in-out",
						{
							"opacity-0": vad.loading || vad.errored,
							"opacity-30": !vad.loading && !vad.errored && !vad.userSpeaking,
							"opacity-100 scale-110": vad.userSpeaking,
						}
					)}
				/>
			</main>
		</>
	);
}

function Messages({
	messages,
	isPending,
	submit,
}: {
	messages: Array<Message>;
	isPending: boolean;
	submit: (data: string) => void;
}) {
	const listRef = useRef<HTMLUListElement>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `messages` is the only dependency that matters
	useEffect(() => {
		if (listRef.current) {
			listRef.current.scrollTop = listRef.current.scrollHeight;
		}
	});

	return (
		<ul className="space-y-4" ref={listRef}>
			{messages.map((message, i) => (
				<li
					key={i}
					className={clsx("flex gap-4", {
						"justify-end": message.role === "user",
					})}
				>
					<div
						className={clsx(
							"rounded-xl p-4 text-white max-w-xl text-balance",
							{
								"bg-blue-600": message.role === "assistant",
								"bg-neutral-600": message.role === "user",
							}
						)}
					>
						{message.content}
					</div>
				</li>
			))}

			{isPending && (
				<li className="flex gap-4">
					<div className="rounded-xl p-4 text-white max-w-xl text-balance bg-blue-600">
						<LoadingIcon />
					</div>
				</li>
			)}
		</ul>
	);
}

function A(props: any) {
	return (
		<a
			{...props}
			className="text-neutral-500 dark:text-neutral-500 hover:underline font-medium"
		/>
	);
} 