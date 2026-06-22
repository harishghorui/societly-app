/**
 * @format
 */
import 'react-native-reanimated';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import './global.css';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';

const messagingInstance = getMessaging();
setBackgroundMessageHandler(messagingInstance, async (remoteMessage) => {
    console.log('🌌 Native Background Message Handled cleanly (Modular API):', remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
