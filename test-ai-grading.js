const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC5q8w8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8",
  authDomain: "kmllk-7f416.firebaseapp.com",
  projectId: "kmllk-7f416",
  storageBucket: "kmllk-7f416.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:123456789"
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

async function testAIGrading() {
  try {
    const aiGradeAssignment = httpsCallable(functions, 'aiGradeAssignment');

    const result = await aiGradeAssignment({
      submissionId: 'test-submission',
      assignmentId: 'test-assignment',
      userId: 'test-user',
      assignmentDescription: 'Write a 500-word essay on climate change',
      submissionText: 'Climate change is a serious issue that affects our planet. It causes rising temperatures, melting ice caps, and extreme weather events. We need to take action to reduce carbon emissions and protect the environment.',
      maxPoints: 100
    });

    console.log('AI Grading Result:', result.data);
  } catch (error) {
    console.error('Error calling function:', error);
  }
}

testAIGrading();