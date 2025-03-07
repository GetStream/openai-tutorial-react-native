import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, Easing } from "react-native";
import Svg, {
  Path,
  PathProps,
  Defs,
  RadialGradient,
  Stop,
} from "react-native-svg";

interface AudioVisualizerProps {
  colorScheme?: "blue" | "red";
  audioLevel: number;
}

type AnimatedPathProps = Animated.AnimatedProps<PathProps>;

const normalizeAudioLevel = (
  level: number,
  minInput = 0,
  maxInput = 1.5,
  randomFactor = 15
): number => {
  const clampedLevel = Math.max(minInput, Math.min(maxInput, level));
  const factor = 150;

  let normalizedValue =
    ((clampedLevel - minInput) / (maxInput - minInput)) * factor;

  // Add randomization
  // Calculate the maximum random adjustment (higher for mid-range values, lower for extremes)
  const maxAdjustment =
    (randomFactor * normalizedValue * (factor - normalizedValue)) / 25;

  // Generate a random adjustment between -maxAdjustment and +maxAdjustment
  const randomAdjustment = (Math.random() * 2 - 1) * maxAdjustment;

  // Apply the random adjustment
  normalizedValue += randomAdjustment;

  return Math.max(0, Math.min(factor, normalizedValue));
};

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  colorScheme = "blue",
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
    steps: number
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
        ])
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
        steps
      );

      // Create a sequence of animations through intermediate values
      const animations = intermediateValues.map((value) =>
        Animated.timing(audioLevelAnim, {
          toValue: value,
          duration: 30, // Short duration for each step
          useNativeDriver: false,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smooth cubic bezier curve
        })
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

  // Combine the base animation with the continuous animation
  const combinedAnimation = Animated.add(audioLevelAnim, continuousAnim);

  // Scale the combined value to the animation range with smoother interpolation
  const animation = combinedAnimation.interpolate({
    inputRange: [0, 25, 50, 75, 100], // More interpolation points
    outputRange: [0.3, 0.5, 0.7, 0.85, 1], // More gradual scaling
    extrapolate: "clamp",
  });

  const blueGradient = {
    center: "#ffffff",
    middle: "#40ffff",
    outer: "#0099ff",
    edge: "#0066cc",
  };

  const redGradient = {
    center: "#ffffff",
    middle: "#ff4040",
    outer: "#ff0000",
    edge: "#cc0000",
  };

  const colors = colorScheme === "blue" ? blueGradient : redGradient;

  const AnimatedPath = Animated.createAnimatedComponent(Path);

  const animatedProps: AnimatedPathProps = {
    fill: "url(#grad)",
    d: animation.interpolate({
      inputRange: [0, 1],
      outputRange: [
        // Base state - larger starting size
        "M 200 140 C 250 140, 260 140, 260 200 C 260 260, 250 260, 200 260 C 150 260, 140 260, 140 200 C 140 140, 150 140, 200 140",
        // Expanded state - even larger maximum size
        "M 200 80 C 290 80, 320 80, 320 200 C 320 320, 290 320, 200 320 C 110 320, 80 320, 80 200 C 80 80, 110 80, 200 80",
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
              fy="50%"
            >
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
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  blobContainer: {
    width: 500,
    height: 500,
    justifyContent: "center",
    alignItems: "center",
  },
});
