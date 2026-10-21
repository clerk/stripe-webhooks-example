import { clerkClient } from '@clerk/nextjs/server'
import type { NextRequest } from 'next/server'
import Stripe from 'stripe'

const DEFAULT_MAX_ALLOWED_MEMBERSHIPS = 1
const UPGRADE_MAX_ALLOWED_MEMBERSHIPS = 10

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
	if (!STRIPE_SECRET_KEY) {
		throw new Error('STRIPE_SECRET_KEY is not set')
	}

	if (!STRIPE_WEBHOOK_SECRET) {
		throw new Error('STRIPE_WEBHOOK_SECRET is not set')
	}

	const stripe = new Stripe(STRIPE_SECRET_KEY)

	const body = await req.text()
	const signature = req.headers.get('stripe-signature')

	if (!signature) {
		return new Response('Missing stripe-signature header', { status: 400 })
	}

	let event: Stripe.Event
	try {
		event = stripe.webhooks.constructEvent(
			body,
			signature,
			STRIPE_WEBHOOK_SECRET
		)
	} catch (err) {
		console.error('Stripe webhook verification failed:', err)
		return new Response('Verification failed', { status: 400 })
	}

	const client = await clerkClient()

	switch (event.type) {
		case 'customer.subscription.created':
		case 'customer.subscription.updated': {
			const subscription = event.data.object as Stripe.Subscription
			const orgId = subscription.metadata.clerk_org_id
			if (!orgId) {
				console.error('No clerk_org_id in subscription metadata')
				return new Response('Missing clerk_org_id', { status: 400 })
			}

			const priceIds = subscription.items.data.map(item => item.price.id)
			console.log(
				`Subscription ${subscription.id} status=${subscription.status} for org ${orgId}, prices: ${priceIds.join(', ')}`
			)

			if (subscription.status === 'active') {
				await client.organizations.updateOrganization(orgId, {
					maxAllowedMemberships: UPGRADE_MAX_ALLOWED_MEMBERSHIPS,
				})
			} else if (
				subscription.status === 'canceled' ||
				subscription.status === 'unpaid'
			) {
				await client.organizations.updateOrganization(orgId, {
					maxAllowedMemberships: DEFAULT_MAX_ALLOWED_MEMBERSHIPS,
				})
			}
			break
		}
		case 'customer.subscription.deleted': {
			const subscription = event.data.object as Stripe.Subscription
			const orgId = subscription.metadata.clerk_org_id
			if (!orgId) {
				console.error('No clerk_org_id in subscription metadata')
				return new Response('Missing clerk_org_id', { status: 400 })
			}

			const priceIds = subscription.items.data.map(item => item.price.id)
			console.log(
				`Subscription ${subscription.id} deleted for org ${orgId}, prices: ${priceIds.join(', ')}`
			)

			await client.organizations.updateOrganization(orgId, {
				maxAllowedMemberships: DEFAULT_MAX_ALLOWED_MEMBERSHIPS,
			})
			break
		}
	}

	return new Response('OK', { status: 200 })
}
