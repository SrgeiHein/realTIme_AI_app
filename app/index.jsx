import React, { useState, useEffect } from "react";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import * as FileSystem from "expo-file-system";
import axios from "axios";

export default function App() {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [transcribedText, setTranscribedText] = useState("");
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  const OPENAI_API_KEY =
    "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";

  // useEffect(() => {
  //   const getPermissions = async () => {
  //     try {
  //       await Audio.requestPermissionsAsync();
  //       await Audio.setAudioModeAsync({
  //         allowsRecordingIOS: true,
  //         playsInSilentModeIOS: true,
  //         playThroughEarpieceAndroid: true,
  //         staysActiveInBackground: true,
  //       });
  //     } catch (err) {
  //       console.error("Failed to get permissions:", err);
  //     }
  //   };

  //   getPermissions();
  // }, []);

  async function startRecording() {
    try {
      if (permissionResponse.status !== "granted") {
        console.log("Requesting permission..");
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log("Starting recording..");
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      console.log("Recording started");
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  }

  async function stopRecording() {
    console.log("Stopping recording..");
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    const uri = recording.getURI();
    console.log("Recording stopped and stored at", uri);
    await processAudioToText(uri);
  }

  const processAudioToText = async (audioUri) => {
    setIsLoading(true);
    try {
      const formData = new FormData();

      // Ensure the uri includes 'file://'
      let fileUri = audioUri;
      if (!fileUri.startsWith("file://")) {
        fileUri = "file://" + fileUri;
      }

      formData.append("file", {
        uri: fileUri,
        type: "audio/m4a",
        name: "audio.m4a",
      });

      console.log("FormData:", formData);

      const response = await axios.post(
        "http://192.168.1.38:1010/transcribe",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Accept: "application/json",
          },
          timeout: 30000, // 30 second timeout
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }
      );

      const data = response.data;

      if (data.text) {
        setTranscribedText(data.text);
        // await getAIResponse(data.text);
      } else {
        throw new Error("No transcription received");
      }
    } catch (err) {
      console.error("Error processing audio:", err);
      setTranscribedText("Error processing audio: " + err.message);
      setAiResponse("Sorry, there was an error processing your audio.");
    } finally {
      setIsLoading(false);
    }
  };

  const getAIResponse = async (text) => {
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: text }],
            max_tokens: 150,
          }),
        }
      );

      const data = await response.json();
      const aiMessage = data.choices[0].message.content;
      setAiResponse(aiMessage);

      await Speech.speak(aiMessage, {
        language: "en",
        pitch: 1.0,
        rate: 0.9,
      });
    } catch (err) {
      console.error("Error getting AI response:", err);
      setAiResponse("Sorry, there was an error getting the AI response.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Voice Chat</Text>

      <View style={styles.textContainer}>
        <Text style={styles.label}>You said:</Text>
        <Text style={styles.text}>
          {transcribedText || "Hold the button and start speaking"}
        </Text>
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.label}>AI Response:</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <Text style={styles.text}>
            {aiResponse || "Waiting for your message..."}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.button, isRecording && styles.buttonActive]}
        onPressIn={startRecording}
        onPressOut={stopRecording}
      >
        <Text style={styles.buttonText}>
          {isRecording ? "Release to Stop" : "Hold to Record"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
  },
  textContainer: {
    width: "100%",
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  text: {
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 20,
    borderRadius: 50,
    width: 200,
    alignItems: "center",
  },
  buttonActive: {
    backgroundColor: "#FF3B30",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
