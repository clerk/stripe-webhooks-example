import { clerkClient } from "@clerk/nextjs/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const evt = await verifyWebhook(req).catch((err) => {
    console.error("Webhook verification failed:", err);
    return null;
  });

  if (!evt) {
    return new Response("Verification failed", { status: 400 });
  }

  const client = await clerkClient();

  switch (evt.type) {
    case "subscriptionItem.active":
      {
        const orgId = evt.data.payer?.organization_id;
        if (!orgId) {
          console.error("No organization_id on subscriptionItem.active event");
          return new Response("Missing organization_id", { status: 400 });
        }
        await client.organizations.updateOrganization(orgId, {
          maxAllowedMemberships: 10,
        });
      }
      break;
    case "subscriptionItem.ended":
      {
        const orgId = evt.data.payer?.organization_id;
        if (!orgId) {
          console.error("No organization_id on subscriptionItem.ended event");
          return new Response("Missing organization_id", { status: 400 });
        }
        await client.organizations.updateOrganization(orgId, {
          maxAllowedMemberships: 1,
        });
      }
      break;
  }

  return new Response("OK", { status: 200 });
}
