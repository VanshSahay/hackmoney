"use client"

import { VariantA } from "#/.claude-design/lab/variants/VariantA"
import { VariantB } from "#/.claude-design/lab/variants/VariantB"
import { VariantC } from "#/.claude-design/lab/variants/VariantC"
import { VariantD } from "#/.claude-design/lab/variants/VariantD"
import { VariantE } from "#/.claude-design/lab/variants/VariantE"
import { FeedbackOverlay } from "./FeedbackOverlay"

const variants = [
	{
		id: "A",
		name: "Hierarchy Focus",
		description:
			"Clean card with hero rate display, glass morphism, progressive disclosure",
		Component: VariantA,
	},
	{
		id: "B",
		name: "Split-Pane Layout",
		description:
			"Side-by-side tokens with color-coded panels, large touch targets",
		Component: VariantB,
	},
	{
		id: "C",
		name: "Ultra-Spacious",
		description:
			"Maximum whitespace, typography-driven, minimalist Apple aesthetic",
		Component: VariantC,
	},
	{
		id: "D",
		name: "Cyberpunk Neon",
		description: "Dark with neon accents, glowing effects, gaming-inspired UI",
		Component: VariantD,
	},
	{
		id: "E",
		name: "Command Palette",
		description:
			"Power user focused, keyboard-first, Linear-inspired aesthetic",
		Component: VariantE,
	},
]

export default function DesignLabPage() {
	return (
		<div className="min-h-screen bg-muted/30">
			{/* Header */}
			<header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-xl font-semibold">Design Lab: Swap Page</h1>
							<p className="text-sm text-muted-foreground">
								5 variants · Premium + Cyberpunk · Spacious density
							</p>
						</div>
						<div className="text-right text-sm text-muted-foreground">
							<p>
								Click <strong>Add Feedback</strong> button (bottom-right)
							</p>
							<p>to comment on specific elements</p>
						</div>
					</div>
				</div>
			</header>

			{/* Variants Grid */}
			<main className="container mx-auto px-4 py-8">
				<div className="grid gap-8">
					{variants.map(({ id, name, description, Component }) => (
						<section key={id} data-variant={id} className="space-y-3">
							{/* Variant label */}
							<div className="flex items-baseline gap-3">
								<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
									{id}
								</span>
								<div>
									<h2 className="font-semibold">{name}</h2>
									<p className="text-sm text-muted-foreground">{description}</p>
								</div>
							</div>

							{/* Variant container */}
							<div className="overflow-hidden rounded-xl border bg-card shadow-sm">
								<Component />
							</div>
						</section>
					))}
				</div>

				{/* Legend */}
				<div className="mt-12 rounded-lg border bg-card p-6">
					<h3 className="mb-4 font-semibold">Variant Summary</h3>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						<div>
							<p className="font-medium">A: Hierarchy Focus</p>
							<p className="text-sm text-muted-foreground">
								Classic card with elevated polish
							</p>
						</div>
						<div>
							<p className="font-medium">B: Split-Pane</p>
							<p className="text-sm text-muted-foreground">
								Visual token emphasis, horizontal flow
							</p>
						</div>
						<div>
							<p className="font-medium">C: Ultra-Spacious</p>
							<p className="text-sm text-muted-foreground">
								Extreme minimalism, Apple-like
							</p>
						</div>
						<div>
							<p className="font-medium">D: Cyberpunk</p>
							<p className="text-sm text-muted-foreground">
								Bold neon, gaming aesthetic
							</p>
						</div>
						<div>
							<p className="font-medium">E: Command Palette</p>
							<p className="text-sm text-muted-foreground">
								Power user, keyboard shortcuts
							</p>
						</div>
					</div>
				</div>
			</main>

			{/* Feedback Overlay - CRITICAL */}
			<FeedbackOverlay targetName="SwapPage" />
		</div>
	)
}
