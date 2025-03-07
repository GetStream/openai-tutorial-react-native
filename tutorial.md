## Setting up the React Native project

Now, let’s switch to the React Native app, that will connect to this API, and provide the visualizations of the AI’s audio levels.

### Step 1 - Adding the Stream Video dependency

Let’s create a new project, for example called `AIVideoDemo`, and add the StreamVideo React Native SDK.

Follow the steps [here](https://getstream.io/video/docs/react-native/setup/installation/react-native/) in order to add the SDK as a dependency to your project. For the best experience, we recommend using version 1.18.0 or above.

### Step 1.2 - Setup Microphone Permissions

Since we will be using the microphone to communicate with the AI bot, we need to configure the appropriate permissions for both iOS and Android platforms.

- iOS

  - add the "Privacy - Microphone Usage Description" permission in the Info.plist file. For example, we can use the following text as a description: "Microphone access needed for talking with AI."

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Microphone access needed for talking with AI.</string>
```

- Android
  - we need to add the microphone permission to the AndroidManifest.xml file. Open the file located at `android/app/src/main/AndroidManifest.xml` and add the following line inside the `<manifest>` tag:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

### Step 1.3 - Local server setup

Since this is a demo application that needs to connect to your locally running server, you'll need to configure your iOS app to allow non-HTTPS connections to your development server. Add the following to your Info.plist file:

```xml
<key>NSAllowsArbitraryLoads</key>
<true/>
```

### Step 1.4 - Stream video setup

In our App.tsx file we can add state variables for the client and call.

```ts
const [client, setClient] = useState<StreamVideoClient | null>(null);
const [call, setCall] = useState<Call | null>(null);
```

First we need to obtain the credentials from the server. We can define an interface for the credentials and a function to fetch them.

```ts
interface CallCredentials {
  apiKey: string;
  token: string;
  userId: string;
  cid: string;
}

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

function parseUserIdFromToken(token: string) {
  const payload = token.split(".")[1];
  if (!payload) {
    return "";
  }
  return JSON.parse(atob(payload)).user_id ?? "";
}
```

The baseUrl const should be set to the url of your local server.

This method is sending a POST request to fetch the credentials to setup the StreamVideo object and get the call data.

**Note:** We are using “localhost” here (as defined in the `baseURL`), the simplest way to test this is to run on simulator. You can also test this on a real device. To do that you need to set `baseURL` to your local network IP address instead. Additionally, your device and your computer should be on the same WiFi network and you need to allow “Arbitrary Loads” and “Local Networking” in your plist (the local server uses http and not https). If we still have issues to access the local server, we can use [ngrok](https://ngrok.com/docs/getting-started/) to expose our local server to the internet.

```ts
const baseUrl = "your localhost url here";
```

### Step 2 - Connecting to Stream Video

We now have the credentials, and we can connect to Stream Video. To do this, add the following code of the `joinCall` function. Here we are creating a new `StreamVideoClient` and a new `Call`. We are also calling the `connectAgent` function to connect to the AI agent from the backend server and then join the call.

```ts
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
```

## Step 3 - Building the UI

We can now start building the UI for our app. To be able to show different UI depending on the state of the app, we'll need to create an app status state variable.

The render method of our App.tsx component can look like this:

```tsx
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Button, StyleSheet, Text, View } from "react-native";
import {
  Call,
  StreamCall,
  StreamVideo,
} from "@stream-io/video-react-native-sdk";

// existing code omitted for brevity

const [status, setStatus] = useState<
  "start" | "joining" | "awaiting-agent" | "joined-with-agent" | "end"
>("start");

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

const styles = StyleSheet.create({
  // styles omitted for brevity
});
```

## Step 4 - Adding the Call Layout

The `CallLayout` component is responsible for displaying the call controls and the audio visualizer. It will be used to display the audio animations for the voice of the AI agent and the human participant.

We call our agent “lucy”, and based on that, we filter out this participant from the current user. This will help us later to show a different color depending on who is speaking.

Each call participant has an audioLevel property, which is a number representing the audio level of the participant which we can use to display the audio visualizer.

```tsx
import {
  HangUpCallButton,
  useCall,
  useCallStateHooks,
} from "@stream-io/video-react-native-sdk";

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
      // TODO: add logic for displaying the audio visualizer
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
```

At this point, we can run the app, join a call, and have a conversation with the AI agent. However, we can take this step further, and show nice visualizations based on the audio levels of the participants.

## Step 5 - Adding the Audio Visualizer

`AudioVisualizer` component will be responsible for displaying the audio levels of the participants.

- we can define a React component that takes two props: colorScheme (either 'blue' or 'red') and audioLevel (a number representing audio intensity).

- we can use React's useRef and useEffect hooks to create and manage two animated values:
  - audioLevelAnim: Responds to changes in the actual audio level
  - continuousAnim: Creates a constant subtle animation effect regardless of audio input
  - we can implement smooth transitions between audio level changes by:
    - Tracking the previous audio level
    - For large changes (>5 units), creating intermediate animation steps
    - For small changes, animating directly to the new value
    - Using bezier curve easing for natural-looking transitions

```tsx
import React, {useEffect, useRef} from 'react';
import {StyleSheet, View, Animated, Easing} from 'react-native';
import Svg, {Path, Defs, RadialGradient, Stop} from 'react-native-svg';
import {PathProps} from 'react-native-svg';

interface AudioVisualizerProps {
  colorScheme?: 'blue' | 'red';
  audioLevel: number;
}

type AnimatedPathProps = Animated.AnimatedProps<PathProps>;

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  colorScheme = 'blue',
  audioLevel = 0,
}) => {
  const normalizedAudioLevel = normalizeAudioLevel(audioLevel);

  // Create a local animated value
  const audioLevelAnim = useRef(new Animated.Value(0)).current;

  // Create a continuous animation value
  const continuousAnim = useRef(new Animated.Value(0)).current;

  // Store previous audio level for smoother transitions
  const prevAudioLevelRef = useRef(0);

  // Generate intermediate values for smoother transitions
  const generateIntermediateValues = (
    start: number,
    end: number,
    steps: number,
  ) => {
    const result = [];
    for (let i = 1; i <= steps; i++) {
      result.push(start + (end - start) * (i / steps));
    }
    return result;
  };

  // Start continuous animation
  useEffect(() => {
    const startContinuousAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(continuousAnim, {
            toValue: 5,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(continuousAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ]),
      ).start();
    };

    startContinuousAnimation();

    return () => {
      continuousAnim.stopAnimation();
    };
  }, [continuousAnim]);

  // React to changes in audioLevel prop with smoother transitions
  useEffect(() => {
    if (Math.abs(normalizedAudioLevel - prevAudioLevelRef.current) > 5) {
      // For significant changes, create intermediate steps
      const steps = 10; // Number of intermediate steps
      const intermediateValues = generateIntermediateValues(
        prevAudioLevelRef.current,
        normalizedAudioLevel,
        steps,
      );

      // Create a sequence of animations through intermediate values
      const animations = intermediateValues.map(value =>
        Animated.timing(audioLevelAnim, {
          toValue: value,
          duration: 30, // Short duration for each step
          useNativeDriver: false,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smooth cubic bezier curve
        }),
      );

      // Run the sequence
      Animated.sequence(animations).start();
    } else {
      // For small changes, animate directly
      Animated.timing(audioLevelAnim, {
        toValue: normalizedAudioLevel,
        duration: 30,
        useNativeDriver: false,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smooth cubic bezier curve
      }).start();
    }

    // Update previous value
    prevAudioLevelRef.current = normalizedAudioLevel;
  }, [normalizedAudioLevel, audioLevelAnim]);

// logic for rendering the animations
```

Next lets combine the calculated animations and draw the audio visualizer. What is left to do is:

- scale the combined animation value using interpolation with multiple points to create a non-linear response that's more visually appealing
- define color gradients for the two different visual modes
- create an animated SVG path that changes shape based on the animation value
- render the visualization using React Native SVG

If the AI is speaking, we can show a blue color with different gradients and when the current user is speaking, we use a red color instead.

```tsx
const combinedAnimation = Animated.add(audioLevelAnim, continuousAnim);

// Scale the combined value to the animation range with smoother interpolation
const animation = combinedAnimation.interpolate({
  inputRange: [0, 25, 50, 75, 100], // More interpolation points
  outputRange: [0.3, 0.5, 0.7, 0.85, 1], // More gradual scaling
  extrapolate: "clamp",
});

const blueGradient = {
    center: '#ffffff',
    middle: '#40ffff',
    outer: '#0099ff',
    edge: '#0066cc',
  };

  const redGradient = {
    center: '#ffffff',
    middle: '#ff4040',
    outer: '#ff0000',
    edge: '#cc0000',
  };

  const colors = colorScheme === 'blue' ? blueGradient : redGradient;

  const AnimatedPath = Animated.createAnimatedComponent(Path);

  const animatedProps: AnimatedPathProps = {
    fill: 'url(#grad)',
    d: animation.interpolate({
      inputRange: [0, 1],
      outputRange: [
        // Base state - larger starting size
        'M 200 140 C 250 140, 260 140, 260 200 C 260 260, 250 260, 200 260 C 150 260, 140 260, 140 200 C 140 140, 150 140, 200 140',
        // Expanded state - even larger maximum size
        'M 200 80 C 290 80, 320 80, 320 200 C 320 320, 290 320, 200 320 C 110 320, 80 320, 80 200 C 80 80, 110 80, 200 80',
      ],
    }),
  };

  return (
    <View style={styles.container}>
      <View style={styles.blobContainer}>
        <Svg height="500" width="500" viewBox="0 0 400 400">
          <Defs>
            <RadialGradient
              id="grad"
              cx="50%"
              cy="50%"
              rx="50%"
              ry="50%"
              fx="50%"
              fy="50%">
              <Stop offset="0%" stopColor={colors.center} stopOpacity="1" />
              <Stop offset="20%" stopColor={colors.middle} stopOpacity="0.9" />
              <Stop offset="50%" stopColor={colors.outer} stopOpacity="0.7" />
              <Stop offset="100%" stopColor={colors.edge} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <AnimatedPath {...animatedProps} />
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blobContainer: {
    width: 500,
    height: 500,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

Finally we can replace the TODO comment above with the audio visualizer component we have just created.

```tsx
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
```

Now, we can run the app, talk to the AI, and see some beautiful visualizations while the participants are speaking.
