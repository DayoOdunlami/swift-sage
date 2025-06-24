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

// TWEAK 2: Fix Visual Contrast (Green → Blue)
// REUSE: Visual data indicators from previous code
// TWEAK: Change green to blue for better contrast
const renderMessage = (content: string) => {
	if (content.includes('📊 **Real Data from Your Todoist:**')) {
		return (
			<div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
				<div className="flex items-center mb-2">
					<span className="text-blue-700 font-medium">📊 Real Data</span>
				</div>
				<div className="text-blue-900">{content}</div>
			</div>
		);
	}
	
	return <div className="whitespace-pre-wrap">{content}</div>;
};

export default function TestV2() {
	const [input, setInput] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const player = usePlayer();
	const vad = useMicVAD({
		startOnLoad: true,
		onSpeechStart: () => {
			console.log("Speech start detected");
			setIsListening(true);
		},
		onSpeechEnd: (audio: any) => {
			if (!isManuallyPaused) {
				console.log("Speech end detected");
				player.stop();
				const wav = utils.encodeWAV(audio);
				const blob = new Blob([wav], { type: "audio/wav" });
				startTransition(() => submit(blob));
				const isFirefox = navigator.userAgent.includes("Firefox");
				if (isFirefox) vad.pause();
			}
		},
		positiveSpeechThreshold: 0.6,
		minSpeechFrames: 4,
	});

	// ADD: Provider state
	const [useWebSpeech, setUseWebSpeech] = useState(true);

	// STAGE 2: Multi-provider state management
	const [llmProvider, setLlmProvider] = useState<'groq' | 'openai' | 'claude' | 'gemini'>('groq');
	const [ttsProvider, setTtsProvider] = useState<'webspeech' | 'cartesia' | 'openai-tts'>('webspeech');

	// STAGE 2: Cost tracking system
	interface UsageStats {
		groq: { calls: number; estimatedCost: number };
		openai: { calls: number; estimatedCost: number };
		claude: { calls: number; estimatedCost: number };
		gemini: { calls: number; estimatedCost: number };
		cartesia: { calls: number; estimatedCost: number };
		'openai-tts': { calls: number; estimatedCost: number };
	}

	const [usageStats, setUsageStats] = useState<UsageStats>(() => {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('swift-sage-usage');
			return saved ? JSON.parse(saved) : {
				groq: { calls: 0, estimatedCost: 0 },
				openai: { calls: 0, estimatedCost: 0 },
				claude: { calls: 0, estimatedCost: 0 },
				gemini: { calls: 0, estimatedCost: 0 },
				cartesia: { calls: 0, estimatedCost: 0 },
				'openai-tts': { calls: 0, estimatedCost: 0 },
			};
		}
		return {
			groq: { calls: 0, estimatedCost: 0 },
			openai: { calls: 0, estimatedCost: 0 },
			claude: { calls: 0, estimatedCost: 0 },
			gemini: { calls: 0, estimatedCost: 0 },
			cartesia: { calls: 0, estimatedCost: 0 },
			'openai-tts': { calls: 0, estimatedCost: 0 },
		};
	});

	// Cost estimation (rough estimates per request)
	const PRICING = {
		groq: 0, // Free
		openai: 0.015, // ~$0.015 per LLM request
		claude: 0.025, // ~$0.025 per LLM request
		gemini: 0.012, // ~$0.012 per LLM request
		cartesia: 0.05, // ~$0.05 per TTS request
		'openai-tts': 0.03, // ~$0.03 per TTS request
		webspeech: 0, // Free
	};

	// Track usage function
	const trackUsage = (provider: string) => {
		const cost = PRICING[provider] || 0;
		
		setUsageStats(prev => {
			const updated = {
				...prev,
				[provider]: {
					calls: prev[provider].calls + 1,
					estimatedCost: prev[provider].estimatedCost + cost,
				}
			};
			
			localStorage.setItem('swift-sage-usage', JSON.stringify(updated));
			return updated;
		});
	};

	// Reset usage
	const resetUsage = () => {
		const resetStats = Object.keys(usageStats).reduce((acc, key) => {
			acc[key] = { calls: 0, estimatedCost: 0 };
			return acc;
		}, {} as UsageStats);
		
		setUsageStats(resetStats);
		localStorage.setItem('swift-sage-usage', JSON.stringify(resetStats));
	};

	// TWEAK 1: Add Simple Stop Controls (Essential)
	const [isListening, setIsListening] = useState(false);
	const [isManuallyPaused, setIsManuallyPaused] = useState(false);

	// ADD: Stop control functions
	const stopListening = () => {
		if (vad) {
			vad.pause();
		}
		setIsListening(false);
		setIsManuallyPaused(true);
	};

	const startListening = () => {
		if (vad) {
			vad.start();
		}
		setIsListening(true);
		setIsManuallyPaused(false);
	};

	const toggleListening = () => {
		if (isListening) {
			stopListening();
		} else {
			startListening();
		}
	};

	// ADD: Simple interruption (your idea)
	const interruptSpeech = () => {
		console.log("⏹️ Interrupting speech...");
		
		// Stop current speech immediately
		speechSynthesis.cancel();
		
		// CRITICAL: Restart VAD after brief delay
		setTimeout(() => {
			if (vad && !isManuallyPaused) {
				console.log("🎤 Restarting VAD after interrupt");
				vad.start();
				setIsListening(true);
			}
		}, 200); // Slightly longer delay for reliability
		
		// Clear any pending states
		setInput("");
		setIsLoading(false);
	};

	// TWEAK 3: Clean Audio (Strip Icons from TTS)
	// ADD: Function to clean text for speech
	const cleanTextForTTS = (text: string): string => {
		return text
			.replace(/📊|🔍|✅|🗑️|📝|⚠️|🔧|✔️/g, '') // Remove icons
			.replace(/\*\*Real Data from Your Todoist:\*\*/g, 'Real data from your Todoist:')
			.replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
			.trim();
	};

	// TWEAK 7: Update VAD to Track State
	useEffect(() => {
		console.log("VAD State:", vad ? "Active" : "Inactive");
		console.log("Input:", input);
	}, [vad, input]);

	// TWEAK 5: Voice Commands (Stop + Interrupt)
	// ADD: Voice command detection to existing transcript processing
	useEffect(() => {
		if (input) {
			const lowerInput = input.toLowerCase().trim();
			
			// LESSON LEARNED: Check stop commands first
			const stopCommands = ['stop', 'pause', 'quiet', 'stop listening'];
			if (stopCommands.some(cmd => lowerInput.includes(cmd))) {
				stopListening();
				setInput("");
				return;
			}
			
			// Simple interrupt commands
			const interruptCommands = ['interrupt', 'cancel'];
			if (interruptCommands.some(cmd => lowerInput.includes(cmd))) {
				interruptSpeech();
				setInput("");
				return;
			}
		}
	}, [input]);

	// TWEAK 4: Safe Keyboard (ESC Only, No Spacebar)
	// ADD: Safe keyboard shortcuts that don't break typing
	useEffect(() => {
		const handleKeyPress = (event: KeyboardEvent) => {
			// LESSON LEARNED: Only when NOT typing in input fields
			const target = event.target as HTMLElement;
			const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
			
			if (!isTyping) {
				// LESSON LEARNED: ESC only (no spacebar to avoid typing conflicts)
				if (event.code === 'Escape') {
					event.preventDefault();
					toggleListening();
				}
				
				// Simple interrupt with Tab
				if (event.code === 'Tab') {
					event.preventDefault();
					interruptSpeech();
				}
			}
		};

		window.addEventListener('keydown', handleKeyPress);
		return () => window.removeEventListener('keydown', handleKeyPress);
	}, []);

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

		// STAGE 2: Send both provider choices and track usage
		formData.append("llmProvider", llmProvider);
		formData.append("ttsProvider", ttsProvider);

		// Track LLM usage
		trackUsage(llmProvider);
		
		// Track TTS usage (if not free)
		if (ttsProvider !== 'webspeech') {
			trackUsage(ttsProvider);
		}

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

		// TWEAK 3: Clean Audio (Strip Icons from TTS)
		// MODIFY: Web Speech handling to use clean text
		if (response.headers.get("X-TTS-Provider") === "webspeech") {
			const text = await response.text();
			const cleanText = cleanTextForTTS(text);
			
			// Keep existing simple loop prevention (this works!)
			if (vad) {
				vad.pause();
			}
			
			if ('speechSynthesis' in window) {
				const utterance = new SpeechSynthesisUtterance(cleanText);
				utterance.rate = 1.0;
				utterance.pitch = 1.0;
				
				utterance.onend = () => {
					setTimeout(() => {
						if (vad) {
							vad.start();
						}
					}, 500);
				};
				
				speechSynthesis.speak(utterance);
			}
			
			setInput("");
			
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
		
		// CRITICAL: Clear the input field after processing
		setInput("");

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
		// CRITICAL: Clear input field after submission
		setInput("");
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

				{/* STAGE 2: Enhanced UI with Dual Provider Selection */}
				<div className="mb-4 space-y-4">
					{/* LLM (Brain) Provider Selection */}
					<div className="p-3 bg-purple-50 border border-purple-200 rounded">
						<label className="block text-sm font-medium mb-2">🧠 AI Brain Provider:</label>
						<select 
							value={llmProvider} 
							onChange={(e) => setLlmProvider(e.target.value)}
							className="w-full px-3 py-1 border rounded"
						>
							<option value="groq">⚡ Groq Llama-3 (Free, Fast) ✅ Available</option>
							<option value="openai" disabled>🧠 OpenAI GPT-4 (Coming Soon)</option>
							<option value="claude" disabled>🎯 Claude 3 (Coming Soon)</option>
							<option value="gemini" disabled>🔍 Google Gemini (Coming Soon)</option>
						</select>
					</div>
					
					{/* TTS (Voice) Provider Selection */}
					<div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
						<label className="block text-sm font-medium mb-2">🗣️ Voice Provider:</label>
						<select 
							value={ttsProvider} 
							onChange={(e) => setTtsProvider(e.target.value)}
							className="w-full px-3 py-1 border rounded"
						>
							<option value="webspeech">🆓 Web Speech (Free, Browser) ✅ Available</option>
							<option value="cartesia">💰 Cartesia (Premium, ~$0.05/call) ✅ Available</option>
							<option value="openai-tts" disabled>🎤 OpenAI TTS (Coming Soon)</option>
						</select>
					</div>
					
					{/* Current Status & Cost Tracking */}
					<div className="p-3 bg-gray-50 border border-gray-200 rounded">
						<div className="flex items-center justify-between mb-2">
							<div className="text-sm">
								<strong>Current:</strong> 🧠 {llmProvider.toUpperCase()} | 🗣️ {ttsProvider.toUpperCase()}
							</div>
							<button
								onClick={resetUsage}
								className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border rounded"
							>
								Reset Usage
							</button>
						</div>
						
						<div className="grid grid-cols-2 gap-3 text-xs">
							<div>
								<div className="font-medium mb-1">🧠 LLM Usage:</div>
								<div>Groq: {usageStats.groq.calls} calls (FREE)</div>
								<div>OpenAI: {usageStats.openai.calls} calls (${usageStats.openai.estimatedCost.toFixed(3)})</div>
								<div>Claude: {usageStats.claude.calls} calls (${usageStats.claude.estimatedCost.toFixed(3)})</div>
								<div>Gemini: {usageStats.gemini.calls} calls (${usageStats.gemini.estimatedCost.toFixed(3)})</div>
							</div>
							
							<div>
								<div className="font-medium mb-1">🗣️ TTS Usage:</div>
								<div>Web Speech: ∞ (FREE)</div>
								<div>Cartesia: {usageStats.cartesia.calls} calls (${usageStats.cartesia.estimatedCost.toFixed(3)})</div>
								<div>OpenAI TTS: {usageStats['openai-tts'].calls} calls (${usageStats['openai-tts'].estimatedCost.toFixed(3)})</div>
							</div>
						</div>
						
						<div className="mt-2 pt-2 border-t text-sm font-medium text-center">
							💰 Total Session Cost: ${Object.values(usageStats).reduce((sum, stat) => sum + stat.estimatedCost, 0).toFixed(3)}
						</div>
					</div>
				</div>

				{/* NEW: Simple stop controls */}
				<div className="mb-4 flex items-center space-x-3">
					<button
						onClick={toggleListening}
						className={`px-4 py-2 rounded font-medium ${
							isListening 
								? 'bg-red-500 text-white hover:bg-red-600' 
								: 'bg-green-500 text-white hover:bg-green-600'
						}`}
					>
						{isListening ? '🛑 Stop Listening' : '🎤 Start Listening'}
					</button>
					
					<button
						onClick={interruptSpeech}
						className="px-4 py-2 bg-orange-500 text-white rounded font-medium hover:bg-orange-600"
					>
						⏹️ Interrupt
					</button>
					
					<div className={`px-3 py-1 rounded text-sm ${
						isListening 
							? 'bg-red-100 text-red-700' 
							: 'bg-gray-100 text-gray-700'
					}`}>
						{isListening ? '🎤 Listening...' : '⏸️ Paused'}
					</div>
				</div>

				<div className="w-full max-w-2xl">
					<Messages
						messages={messages}
						isPending={isPending}
						submit={submit}
						renderMessage={renderMessage}
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
	renderMessage,
}: {
	messages: Array<Message>;
	isPending: boolean;
	submit: (data: string) => void;
	renderMessage: (content: string) => React.ReactNode;
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
						{renderMessage(message.content)}
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