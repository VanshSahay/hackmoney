import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { headers } from "next/headers"
import { cookieToInitialState } from "wagmi"
import { Header } from "#/components/layout/header"
import { wagmiConfig } from "#/config/wagmi"
import { Web3Provider } from "#/providers/web3-provider"
import "./globals.css"

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
})

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
})

export const metadata: Metadata = {
	title: "HackMoney — Privacy-Preserving DEX",
	description:
		"Intent-based MPC settlement protocol for private, efficient swaps",
}

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const headerStore = await headers()
	const cookie = headerStore.get("cookie") ?? ""
	const initialState = cookieToInitialState(wagmiConfig, cookie)

	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
			>
				<Web3Provider initialState={initialState}>
					<Header />
					<main>{children}</main>
				</Web3Provider>
			</body>
		</html>
	)
}
