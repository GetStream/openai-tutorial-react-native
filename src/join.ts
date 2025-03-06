import { Call, StreamVideoClient } from "@stream-io/video-react-native-sdk";
import { PermissionsAndroid, Platform } from "react-native";

interface CallCredentials {
  apiKey: string;
  token: string;
  userId: string;
  cid: string;
}

const baseUrl = "https://3f66-46-217-121-34.ngrok-free.app";

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

async function requestAudioPermission() {
  if (Platform.OS !== "android") return true;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: "Microphone Permission",
        message: "App needs access to your microphone to make calls.",
        buttonNeutral: "Ask Me Later",
        buttonNegative: "Cancel",
        buttonPositive: "OK",
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn(err);
    return false;
  }
}

export async function joinCall(
  credentials: CallCredentials
): Promise<[client: StreamVideoClient, call: Call]> {
  // Request permission before joining
  const hasPermission = await requestAudioPermission();
  if (!hasPermission) {
    throw new Error("Microphone permission denied");
  }

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
