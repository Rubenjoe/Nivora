import "server-only";
import { Account, Client } from "node-appwrite";
import { cookies } from "next/headers";

function appwriteConfig() {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (!endpoint || !projectId) throw new Error("Appwrite is not configured.");
  return { endpoint, projectId };
}

export function createAdminAccount() {
  const { endpoint, projectId } = appwriteConfig();
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!apiKey)
    throw new Error("Appwrite server authentication is not configured.");
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);
  return { account: new Account(client), projectId };
}

export async function createSessionAccount() {
  const { endpoint, projectId } = appwriteConfig();
  const session = (await cookies()).get(`a_session_${projectId}`)?.value;
  if (!session) return null;
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setSession(session);
  return { account: new Account(client), projectId };
}

export function hasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const appUrl = process.env.APP_URL;
  if (!origin || !appUrl) return false;
  try {
    return new URL(origin).origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}
