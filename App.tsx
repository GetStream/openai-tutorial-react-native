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

const credentialsPromise = fetchCallCredentials();

function App(): React.JSX.Element {
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
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();
  const agentParticipant =
    participants.find((p) => p.userId === "lucy") ?? null;
  const humanParticipant =
    participants.find((p) => p.userId !== "lucy") ?? null;
  const audioLevel = agentParticipant?.isDominantSpeaker
    ? agentParticipant?.audioLevel
    : humanParticipant?.audioLevel;

  return (
    <>
      {agentParticipant && (
        <AudioVisualizer
          colorScheme={agentParticipant.isDominantSpeaker ? "blue" : "red"}
          audioLevel={audioLevel || 0}
        />
      )}
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
