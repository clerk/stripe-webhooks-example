import { Show } from '@clerk/nextjs'
import { SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { Suspense } from 'react'

export default function Home() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-4">
			<h1 className="text-2xl font-bold">Billing Webhooks</h1>
			<Suspense>
				<Show when="signed-out">
					<div className="flex gap-2">
						<SignInButton />
						<SignUpButton />
					</div>
				</Show>
				<Show when="signed-in">
					<UserButton />
				</Show>
			</Suspense>
		</div>
	)
}
