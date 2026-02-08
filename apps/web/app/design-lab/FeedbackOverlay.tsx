"use client"

import { Check, Copy, MessageSquarePlus, Send, X } from "lucide-react"
import { type ReactNode, useCallback, useEffect, useState } from "react"

interface Comment {
	id: string
	variant: string
	selector: string
	description: string
	text: string
	x: number
	y: number
}

interface FeedbackOverlayProps {
	targetName: string
	children?: ReactNode
}

function getElementSelector(el: HTMLElement): string {
	if (el.id) return `#${el.id}`
	if (el.dataset.testid) return `[data-testid="${el.dataset.testid}"]`
	if (el.className && typeof el.className === "string") {
		const classes = el.className
			.split(" ")
			.filter((c) => c && !c.startsWith("hover:") && !c.startsWith("focus:"))
		if (classes.length > 0) return `.${classes[0]}`
	}
	return el.tagName.toLowerCase()
}

function getElementDescription(el: HTMLElement): string {
	const tag = el.tagName.toLowerCase()
	const text = el.textContent?.trim().slice(0, 30) || ""
	return `${tag}${text ? ` with "${text}"` : ""}`
}

function getVariantFromElement(el: HTMLElement): string | null {
	let current: HTMLElement | null = el
	while (current) {
		if (current.dataset.variant) return current.dataset.variant
		current = current.parentElement
	}
	return null
}

export function FeedbackOverlay({ targetName }: FeedbackOverlayProps) {
	const [isActive, setIsActive] = useState(false)
	const [comments, setComments] = useState<Comment[]>([])
	const [currentComment, setCurrentComment] = useState<Partial<Comment> | null>(
		null,
	)
	const [overallDirection, setOverallDirection] = useState("")
	const [copied, setCopied] = useState(false)
	const [showPanel, setShowPanel] = useState(false)

	const handleElementClick = useCallback(
		(e: MouseEvent) => {
			if (!isActive) return

			const target = e.target as HTMLElement
			if (target.closest("[data-feedback-ui]")) return

			e.preventDefault()
			e.stopPropagation()

			const variant = getVariantFromElement(target)
			if (!variant) return

			const rect = target.getBoundingClientRect()
			setCurrentComment({
				id: Date.now().toString(),
				variant,
				selector: getElementSelector(target),
				description: getElementDescription(target),
				x: rect.left + rect.width / 2,
				y: rect.top,
				text: "",
			})
		},
		[isActive],
	)

	useEffect(() => {
		if (isActive) {
			document.addEventListener("click", handleElementClick, true)
			document.body.style.cursor = "crosshair"
		} else {
			document.body.style.cursor = ""
		}
		return () => {
			document.removeEventListener("click", handleElementClick, true)
			document.body.style.cursor = ""
		}
	}, [isActive, handleElementClick])

	const saveComment = () => {
		if (currentComment?.text && currentComment.id) {
			setComments((prev) => [...prev, currentComment as Comment])
			setCurrentComment(null)
		}
	}

	const formatFeedback = (): string => {
		const grouped = comments.reduce(
			(acc, c) => {
				if (!acc[c.variant]) acc[c.variant] = []
				acc[c.variant].push(c)
				return acc
			},
			{} as Record<string, Comment[]>,
		)

		let output = `## Design Lab Feedback\n\n**Target:** ${targetName}\n**Comments:** ${comments.length}\n\n`

		for (const [variant, variantComments] of Object.entries(grouped)) {
			output += `### Variant ${variant}\n`
			variantComments.forEach((c, i) => {
				output += `${i + 1}. **${c.description}** (\`${c.selector}\`)\n   "${c.text}"\n\n`
			})
		}

		output += `### Overall Direction\n${overallDirection || "(Not provided)"}\n`
		return output
	}

	const copyFeedback = async () => {
		const text = formatFeedback()
		await navigator.clipboard.writeText(text)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<>
			{/* Comment markers */}
			{comments.map((c, i) => (
				<div
					key={c.id}
					className="fixed z-50 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white shadow-lg"
					style={{ left: c.x - 12, top: c.y - 12 }}
				>
					{i + 1}
				</div>
			))}

			{/* Current comment input */}
			{currentComment && (
				<div
					data-feedback-ui
					className="fixed z-50 w-72 rounded-lg border bg-card p-3 shadow-xl"
					style={{
						left: Math.min(currentComment.x!, window.innerWidth - 300),
						top: currentComment.y! + 10,
					}}
				>
					<div className="mb-2 flex items-center justify-between">
						<span className="text-xs font-medium text-muted-foreground">
							Variant {currentComment.variant} · {currentComment.description}
						</span>
						<button
							onClick={() => setCurrentComment(null)}
							className="text-muted-foreground hover:text-foreground"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
					<textarea
						autoFocus
						value={currentComment.text || ""}
						onChange={(e) =>
							setCurrentComment({ ...currentComment, text: e.target.value })
						}
						placeholder="What should change here?"
						className="w-full resize-none rounded border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
						rows={2}
					/>
					<div className="mt-2 flex justify-end">
						<button
							onClick={saveComment}
							disabled={!currentComment.text}
							className="flex items-center gap-1 rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
						>
							<Send className="h-3 w-3" />
							Save
						</button>
					</div>
				</div>
			)}

			{/* Floating action button */}
			<div
				data-feedback-ui
				className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
			>
				{showPanel && (
					<div className="w-80 rounded-lg border bg-card p-4 shadow-xl">
						<h3 className="mb-3 font-semibold">Feedback Summary</h3>
						<p className="mb-2 text-sm text-muted-foreground">
							{comments.length} comment(s)
						</p>

						<textarea
							value={overallDirection}
							onChange={(e) => setOverallDirection(e.target.value)}
							placeholder="Overall direction: Which variant wins? What to combine?"
							className="w-full resize-none rounded border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
							rows={3}
						/>

						<button
							onClick={copyFeedback}
							disabled={comments.length === 0 && !overallDirection}
							className="mt-3 flex w-full items-center justify-center gap-2 rounded bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
						>
							{copied ? (
								<Check className="h-4 w-4" />
							) : (
								<Copy className="h-4 w-4" />
							)}
							{copied ? "Copied!" : "Copy Feedback"}
						</button>
					</div>
				)}

				<div className="flex items-center gap-2">
					{comments.length > 0 && (
						<button
							onClick={() => setShowPanel(!showPanel)}
							className="rounded-full bg-card px-4 py-2 text-sm font-medium shadow-lg border hover:bg-muted transition-colors"
						>
							{comments.length} comment{comments.length !== 1 ? "s" : ""}
						</button>
					)}

					<button
						onClick={() => {
							setIsActive(!isActive)
							if (isActive) setCurrentComment(null)
						}}
						className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all ${
							isActive
								? "bg-purple-500 text-white scale-110"
								: "bg-card border hover:bg-muted"
						}`}
					>
						{isActive ? (
							<X className="h-5 w-5" />
						) : (
							<MessageSquarePlus className="h-5 w-5" />
						)}
					</button>
				</div>
			</div>

			{/* Active mode indicator */}
			{isActive && (
				<div
					data-feedback-ui
					className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-purple-500 px-4 py-2 text-sm font-medium text-white shadow-lg"
				>
					Click any element to add feedback
				</div>
			)}
		</>
	)
}
