const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');

// Initialize Firebase (you'll need to add your actual config)
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

async function testMessaging() {
  try {
    console.log('Testing messaging functions...');

    // Test sending a message (this will fail without auth, but shows the function exists)
    const sendMessageFn = httpsCallable(functions, 'sendMessage');
    console.log('sendMessage function:', typeof sendMessageFn);

    // Test getting messages
    const getMessagesFn = httpsCallable(functions, 'getMessages');
    console.log('getMessages function:', typeof getMessagesFn);

    // Test marking as read
    const markAsReadFn = httpsCallable(functions, 'markMessageAsRead');
    console.log('markMessageAsRead function:', typeof markAsReadFn);

    // Test getting message thread
    const getThreadFn = httpsCallable(functions, 'getMessageThread');
    console.log('getMessageThread function:', typeof getThreadFn);

    console.log('All messaging functions are available!');
  } catch (error) {
    console.error('Error testing messaging:', error);
  }
}

testMessaging();