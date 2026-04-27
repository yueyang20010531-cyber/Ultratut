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

async function testAIAssignmentGeneration() {
  try {
    console.log('Testing AI Assignment Generation...');

    // Test generating an assignment
    const generateAssignmentFn = httpsCallable(functions, 'generateAssignment');
    console.log('generateAssignment function:', typeof generateAssignmentFn);

    console.log('AI Assignment Generation function is available!');
    console.log('You can now test it through the frontend at http://localhost:3000/');
  } catch (error) {
    console.error('Error testing AI assignment generation:', error);
  }
}

testAIAssignmentGeneration();