import React, { useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import {
  Call,
  HangUpCallButton,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  useCall,
  useCallStateHooks,
} from "@stream-io/video-react-native-sdk";
import { fetchCallCredentials, joinCall } from "./src/join";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AudioVisualizer } from "./src/AudioVisualizer";
import inCallManager from "react-native-incall-manager";

const credentialsPromise = fetchCallCredentials();

function App() {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [status, setStatus] = useState<
    "start" | "joining" | "awaiting-agent" | "joined-with-agent" | "end"
  >("start");

  const handleJoin = () => {
    setStatus("joining");
    credentialsPromise
      .then((credentials) => joinCall(credentials))
      .then(([client, call]) => {
        setClient(client);
        setCall(call);
        setStatus("joined-with-agent");
        inCallManager.setSpeakerphoneOn(true);
      })
      .catch((err: any) => {
        console.error("Could not join call", err);
        setStatus("start");
      });
  };

  const handleLeave = () => {
    setStatus("start");
  };

  return (
    <GestureHandlerRootView>
      <View style={styles.container}>
        {status === "start" && (
          <View style={styles.joinContainer}>
            <Button title="Click to talk with AI" onPress={handleJoin} />
          </View>
        )}
        {(status === "joining" || status === "awaiting-agent") && (
          <View style={styles.textContainer}>
            <Text style={styles.statusText}>Waiting for agent to join...</Text>
          </View>
        )}
        {client && call && status !== "start" && (
          <View style={styles.callContainer}>
            <StreamVideo client={client}>
              <StreamCall call={call}>
                {status !== "end" ? (
                  <CallLayout
                    onAgentJoined={() => setStatus("joined-with-agent")}
                    onLeave={handleLeave}
                  />
                ) : (
                  <Text>End</Text>
                )}
              </StreamCall>
            </StreamVideo>
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

function CallLayout(props: {
  onAgentJoined?: () => void;
  onLeave?: () => void;
}) {
  const call = useCall();
  const { useDominantSpeaker } = useCallStateHooks();
  const dominantSpeaker = useDominantSpeaker();
  return (
    <>
      <AudioVisualizer
        colorScheme={dominantSpeaker?.isLocalParticipant ? "red" : "blue"}
        audioLevel={dominantSpeaker?.audioLevel || 0}
      />
      <View style={styles.callControls}>
        <HangUpCallButton
          onPressHandler={() => {
            call?.endCall();
            props.onLeave?.();
          }}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
  joinContainer: {
    flex: 1,
    justifyContent: "center",
    width: "100%",
    alignItems: "center",
  },
  textContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  callContainer: {
    flex: 1,
    padding: 16,
    width: "100%",
  },
  statusText: {
    color: "white",
    fontSize: 16,
  },
  callControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
});

export default App;
