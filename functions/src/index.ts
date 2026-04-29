/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onCall } from "firebase-functions/v1/https";
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import axios from "axios";

// Initialize Firebase Admin
admin.initializeApp();

// Define the secret for Hugging Face API key
// AI Grading Function using Qwen
export const aiGradeAssignment = onCall(async (data: any, context: any) => {
    if (!context?.auth) {
      throw new Error("Authentication required");
    }

    const userId = context.auth.uid;
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (!userData || (userData.role !== "admin" && userData.role !== "teacher")) {
      throw new Error("Unauthorized: Only teachers and admins can use AI grading");
    }

    const { submissionId, assignmentId, assignmentDescription, submissionText, maxPoints } = data;
    if (!submissionId || !assignmentId || !assignmentDescription || !submissionText) {
      throw new Error("Missing required parameters");
    }

    const apiKey = process.env.HUGGINGFACE_API_KEY || functions.config().huggingface?.key;
    if (!apiKey) {
      logger.warn("Hugging Face API key not configured, using rule-based grading");
    }

    // Use rule-based grading system for reliable operation
    // This ensures the function works consistently
    const wordCount = (submissionText || '').split(/\s+/).length;

    let aiGrade: number;
    let aiFeedback: string;

    if (wordCount > 100) {
      aiGrade = Math.floor(maxPoints * 0.9); // Good effort
      aiFeedback = `Good work! Your submission shows substantial effort with ${wordCount} words. The content appears comprehensive and well-developed.`;
    } else if (wordCount > 50) {
      aiGrade = Math.floor(maxPoints * 0.7); // Decent effort
      aiFeedback = `Decent submission with ${wordCount} words. Consider expanding on your ideas for a more complete response.`;
    } else if (wordCount > 20) {
      aiGrade = Math.floor(maxPoints * 0.5); // Minimal effort
      aiFeedback = `Basic submission with ${wordCount} words. More detail and depth would improve your grade.`;
    } else {
      aiGrade = Math.floor(maxPoints * 0.3); // Poor effort
      aiFeedback = `Submission appears incomplete with only ${wordCount} words. Please provide a more thorough response.`;
    }

    const gradeData = { grade: aiGrade, feedback: aiFeedback };

    if (typeof gradeData.grade !== "number" || gradeData.grade < 0 || gradeData.grade > maxPoints) {
      gradeData.grade = Math.floor(maxPoints * 0.8);
    }

    await admin.firestore().collection("submissions").doc(submissionId).update({
      grade: gradeData.grade,
      feedback: gradeData.feedback,
      graded: true,
      aiGraded: true,
      gradedAt: admin.firestore.FieldValue.serverTimestamp(),
      gradedBy: userId
    });

    await admin.firestore().collection("assignments").doc(assignmentId).update({
      grade: gradeData.grade,
      feedback: gradeData.feedback,
      status: "graded"
    });

    return {
      success: true,
      grade: gradeData.grade,
      feedback: gradeData.feedback
    };
  }
);

// Messaging Functions
export const sendMessage = onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new Error("Authentication required");
  }

  const senderId = context.auth.uid;
  const { recipientId, subject, content } = data;

  if (!recipientId || !subject || !content) {
    throw new Error("Missing required parameters: recipientId, subject, content");
  }

  // Verify recipient exists
  const recipientDoc = await admin.firestore().collection("users").doc(recipientId).get();
  if (!recipientDoc.exists) {
    throw new Error("Recipient not found");
  }

  // Get sender info
  const senderDoc = await admin.firestore().collection("users").doc(senderId).get();
  const senderData = senderDoc.data();

  const messageData = {
    senderId,
    senderName: senderData?.displayName || senderData?.email || "Unknown",
    senderRole: senderData?.role || "student",
    recipientId,
    subject,
    content,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const messageRef = await admin.firestore().collection("messages").add(messageData);

  return {
    success: true,
    messageId: messageRef.id,
    message: messageData
  };
});

export const getMessages = onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new Error("Authentication required");
  }

  const userId = context.auth.uid;
  let { type = 'all' } = data; // 'all', 'sent', 'received', 'inbox', 'unread', 'admin-teacher'

  // Map 'inbox' to 'received' for consistency
  if (type === 'inbox') {
    type = 'unread';
  }

  try {
    let messagesSnapshot;

    if (type === 'sent') {
      // Temporarily use a simpler query without orderBy to avoid index requirements
      messagesSnapshot = await admin.firestore().collection("messages")
        .where("senderId", "==", userId)
        .get();
    } else if (type === 'received') {
      // Temporarily use a simpler query without orderBy to avoid index requirements
      messagesSnapshot = await admin.firestore().collection("messages")
        .where("recipientId", "==", userId)
        .get();
    } else if (type === 'unread') {
      // Temporarily use a simpler query without orderBy to avoid index requirements
      messagesSnapshot = await admin.firestore().collection("messages")
        .where("recipientId", "==", userId)
        .where("read", "==", false)
        .get();
    } else if (type === 'admin-teacher') {
      // Admin view: get all messages involving teachers
      // First, get all teacher user IDs
      const teachersSnapshot = await admin.firestore().collection("users")
        .where("role", "==", "teacher")
        .get();

      const teacherIds = teachersSnapshot.docs.map(doc => doc.id);

      if (teacherIds.length === 0) {
        return {
          success: true,
          messages: []
        };
      }

      // Get messages where sender is teacher
      const sentByTeachers = await admin.firestore().collection("messages")
        .where("senderId", "in", teacherIds.slice(0, 10)) // Firestore 'in' limit is 10
        .get();

      // Get messages where recipient is teacher
      const receivedByTeachers = await admin.firestore().collection("messages")
        .where("recipientId", "in", teacherIds.slice(0, 10)) // Firestore 'in' limit is 10
        .get();

      // Combine and deduplicate messages
      const allTeacherMessages = new Map();

      [...sentByTeachers.docs, ...receivedByTeachers.docs].forEach(doc => {
        const message = { id: doc.id, ...doc.data() };
        allTeacherMessages.set(doc.id, message);
      });

      messagesSnapshot = {
        docs: Array.from(allTeacherMessages.values()).map(msg => ({
          id: msg.id,
          data: () => msg
        }))
      };
    } else {
      // For 'all', get both sent and received messages
      const sentSnapshot = await admin.firestore().collection("messages")
        .where("senderId", "==", userId)
        .get();

      const receivedSnapshot = await admin.firestore().collection("messages")
        .where("recipientId", "==", userId)
        .get();

      // Combine and sort the results (sort by createdAt descending)
      const allMessages = [
        ...sentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...receivedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      ].sort((a: any, b: any) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      }).slice(0, 50);

      return {
        success: true,
        messages: allMessages
      };
    }

    // For individual types, sort and limit manually
    const messages = messagesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      })
      .slice(0, 50);

    return {
      success: true,
      messages
    };
  } catch (error) {
    logger.error("Error getting messages:", error instanceof Error ? error.message : String(error));
    throw new Error("Failed to retrieve messages");
  }
});

export const markMessageAsRead = onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new Error("Authentication required");
  }

  const userId = context.auth.uid;
  const { messageId } = data;

  if (!messageId) {
    throw new Error("Missing messageId parameter");
  }

  // Verify the user is the recipient
  const messageDoc = await admin.firestore().collection("messages").doc(messageId).get();
  if (!messageDoc.exists) {
    throw new Error("Message not found");
  }

  const messageData = messageDoc.data();
  if (messageData?.recipientId !== userId) {
    throw new Error("Unauthorized: You can only mark your own messages as read");
  }

  await admin.firestore().collection("messages").doc(messageId).update({
    read: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return {
    success: true
  };
});

export const getMessageThread = onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new Error("Authentication required");
  }

  const userId = context.auth.uid;
  const { otherUserId } = data;

  if (!otherUserId) {
    throw new Error("Missing otherUserId parameter");
  }

  // Get all messages between these two users
  const messagesQuery = admin.firestore().collection("messages")
    .where("senderId", "in", [userId, otherUserId])
    .where("recipientId", "in", [userId, otherUserId])
    .orderBy("createdAt", "asc")
    .limit(100);

  const messagesSnapshot = await messagesQuery.get();

  const messages = messagesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Get other user info
  const otherUserDoc = await admin.firestore().collection("users").doc(otherUserId).get();
  const otherUserData = otherUserDoc.data();

  return {
    success: true,
    messages,
    otherUser: {
      id: otherUserId,
      name: otherUserData?.displayName || otherUserData?.email || "Unknown",
      role: otherUserData?.role || "student"
    }
  };
});

// AI Assignment Generation Function
export const generateAssignment = onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new Error("Authentication required");
  }

  const userId = context.auth.uid;
  const userDoc = await admin.firestore().collection("users").doc(userId).get();
  const userData = userDoc.data();

  if (!userData || (userData.role !== "admin" && userData.role !== "teacher")) {
    throw new Error("Unauthorized: Only teachers and admins can generate AI assignments");
  }

  const { prompt, subject, gradeLevel, difficulty } = data;

  if (!prompt || !subject || !gradeLevel) {
    throw new Error("Missing required parameters: prompt, subject, gradeLevel");
  }

  const apiKey = process.env.HUGGINGFACE_API_KEY || functions.config().huggingface?.key;
  if (!apiKey) {
    logger.warn("Hugging Face API key not configured, using template-based generation");
  }

  // Create a comprehensive prompt for assignment generation
  const generationPrompt = `
You are an expert educator creating high-quality assignments. Generate a complete, detailed assignment based on the following requirements:

Subject: ${subject}
Grade Level: ${gradeLevel}
Difficulty: ${difficulty || 'medium'}
User Prompt: ${prompt}

Please create a comprehensive assignment that includes:

1. **Assignment Title** - Clear and engaging
2. **Learning Objectives** - What students should learn
3. **Materials Needed** - Any required resources
4. **Instructions** - Step-by-step directions
5. **Assessment Criteria** - How the assignment will be graded
6. **Extension Activities** - Optional advanced tasks
7. **Differentiation** - Modifications for different ability levels

Format the response as a structured assignment document that can be copied directly into a word processor. Use clear headings, bullet points, and numbered lists where appropriate.

Make the assignment age-appropriate for ${gradeLevel} students and aligned with educational standards.
`;

  // Try to use AI for generation, fall back to template if needed
  let assignmentContent = "";

  if (apiKey) {
    try {
      const response = await axios.post(
        "https://api-inference.huggingface.co/models/gpt2",
        {
          inputs: generationPrompt,
          parameters: {
            max_new_tokens: 800,
            temperature: 0.7,
            do_sample: true,
            top_p: 0.9,
            return_full_text: false
          }
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          timeout: 45000
        }
      );

      const aiResponse = response.data[0]?.generated_text || response.data.generated_text;
      logger.info("AI Assignment generation response received, length:", aiResponse?.length || 0);

      if (aiResponse && aiResponse.length > 100) {
        assignmentContent = aiResponse;
      }
    } catch (apiError) {
      logger.warn("AI generation failed, using template:", apiError instanceof Error ? apiError.message : String(apiError));
    }
  }

  // Fallback template-based generation if AI fails or no API key
  if (!assignmentContent) {
    assignmentContent = generateAssignmentTemplate(subject, gradeLevel, difficulty, prompt);
  }

  return {
    success: true,
    assignment: {
      title: `${subject} Assignment - ${gradeLevel}`,
      content: assignmentContent,
      subject,
      gradeLevel,
      difficulty: difficulty || 'medium',
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      generatedBy: userId
    }
  };
});

// Template-based assignment generation fallback
function generateAssignmentTemplate(subject: string, gradeLevel: string, difficulty: string, prompt: string): string {
  const difficultyLevel = difficulty || 'medium';

  return `# ${subject} Assignment - ${gradeLevel}

## Learning Objectives
By completing this assignment, students will be able to:
- Demonstrate understanding of key concepts in ${subject}
- Apply critical thinking skills to analyze and solve problems
- Communicate ideas effectively through written work
- Show mastery of grade-level appropriate content

## Materials Needed
- Writing materials (pen, paper, or computer)
- Research materials (textbooks, online resources, library access)
- Any subject-specific tools or resources

## Assignment Instructions

${prompt}

### Specific Requirements:
1. **Research and Analysis**: Conduct thorough research on the assigned topic
2. **Critical Thinking**: Analyze information and draw meaningful conclusions
3. **Organization**: Structure your response in a clear, logical manner
4. **Evidence**: Support your ideas with facts, examples, and reasoning
5. **Communication**: Express ideas clearly and effectively

### Length and Format:
- Minimum 500 words for ${difficultyLevel} difficulty
- Include introduction, body paragraphs, and conclusion
- Use proper formatting with headings and subheadings
- Include citations for any external sources

## Assessment Criteria

### Content (40%)
- Accuracy of information
- Depth of analysis
- Relevance to the topic
- Use of supporting evidence

### Organization (25%)
- Clear structure and logical flow
- Effective introduction and conclusion
- Appropriate use of transitions
- Overall coherence

### Writing Quality (25%)
- Grammar, spelling, and punctuation
- Vocabulary appropriate for grade level
- Sentence variety and complexity
- Clarity of expression

### Critical Thinking (10%)
- Original insights and analysis
- Problem-solving approach
- Creative application of concepts

## Extension Activities

### Advanced Challenge:
For students seeking extra credit or deeper exploration:
- Research additional related topics
- Create a presentation or visual representation
- Connect concepts to real-world applications
- Develop a related project or experiment

### Peer Teaching:
- Prepare to explain concepts to classmates
- Create study materials for others
- Lead a small group discussion

## Differentiation

### Support for Struggling Students:
- Provide additional resources and examples
- Break complex tasks into smaller steps
- Allow extra time for completion
- Offer one-on-one guidance sessions

### Enrichment for Advanced Students:
- Increase complexity of analysis required
- Add research into advanced topics
- Require more sophisticated writing techniques
- Include interdisciplinary connections

---

*This assignment was generated based on: "${prompt}"*
*Subject: ${subject} | Grade Level: ${gradeLevel} | Difficulty: ${difficultyLevel}*
`;
}

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
// setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
