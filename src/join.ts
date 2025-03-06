import { Call, StreamVideoClient } from "@stream-io/video-react-native-sdk";

interface CallCredentials {
  apiKey: string;
  token: string;
  userId: string;
  cid: string;
}

const baseUrl = "your localhost url here";

export async function fetchCallCredentials() {
  const res = await fetch(`${baseUrl}/credentials`);

  if (res.status !== 200) {
    throw new Error("Could not fetch call credentials");
  }

  const credentials = await res.json();

  return {
    apiKey: credentials.apiKey,
    token: credentials.token,
    userId: parseUserIdFromToken(credentials.token),
    cid: credentials.cid,
  };
}

export async function joinCall(
  credentials: CallCredentials
): Promise<[client: StreamVideoClient, call: Call]> {
  const client = new StreamVideoClient({
    apiKey: credentials.apiKey,
    user: { id: credentials.userId },
    token: credentials.token,
  });
  const [callType, callId] = credentials.cid.split(":");
  const call = client.call(callType, callId);

  try {
    await Promise.all([connectAgent(call), call.join({ create: true })]);
  } catch (err) {
    call.leave();
    client.disconnectUser();
    throw err;
  }

  return [client, call];
}

async function connectAgent(call: Call) {
  const res = await fetch(`${baseUrl}/${call.cid}/connect`, {
    method: "POST",
  });

  if (res.status !== 200) {
    throw new Error("Could not connect agent");
  }
}

function parseUserIdFromToken(token: string) {
  const payload = token.split(".")[1];
  if (!payload) {
    return "";
  }
  return JSON.parse(atob(payload)).user_id ?? "";
}
