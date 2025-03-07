# Stream Video AI Demo React Native

A React Native application that implements OpenAI integration for audio calls with visualization of the audio voices. Shows a glimpse of the AI-powered features that can be built using the Stream Video SDK.

Here's a screenshot of the end result:

<img src="app-preview.png" alt="app preview" width="250" height="500">

## What the app does

- Connects to an audio call with an AI agent, so the user can discuss technical topics regarding the Stream Products
- Visualizes the audio of the agent and the user
- Uses OpenAI to power the AI agent

### Prerequisites

- You have followed the steps in the [Node.js server](https://github.com/GetStream/openai-tutorial-node) and you have a localhost running
  - Stream account with API key and secret
  - OpenAI API key with access to the Realtime API
- Stream Video's iOS SDK (1.18.0 or above for the best experience)

### Step 1: Start the backend and client servers

- first you need to start the backend server.
  More info on the backend server can be found [here](https://github.com/GetStream/openai-tutorial-node?tab=readme-ov-file#stream-video-ai-demo-server)

  - update the `src/join.ts` file on line:10 `const baseUrl = "your localhost url here";` with an url to your local backend server
  - for easier access from your testing devices, you can use [ngrok](https://ngrok.com/docs/getting-started/) to get a public url for your local server

- then, you will need to run the client **Metro** dev server

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

### Step 2: Build and run the app

#### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

#### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

```sh
bundle install
```

```sh
bundle exec pod install
```

To start the native iOS app, run the following command:

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

### License

This project is licensed under the BSD 3-Clause License - see the LICENSE file for details.
