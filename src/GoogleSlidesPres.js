import { google } from 'googleapis';

// Replace with your own credentials
const CLIENT_ID = '132549209921-869h4vcgarn4hme62giqoumu60vai1ij.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';
const ACCESS_TOKEN = 'your-access-token';
const REFRESH_TOKEN = 'your-refresh-token';

const auth = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

auth.setCredentials({
  access_token: ACCESS_TOKEN,
  refresh_token: REFRESH_TOKEN
});

const createPresentation = async (summaryPoints) => {
  const slides = google.slides({ version: 'v1', auth });

  // Create a new presentation
  const presentation = await slides.presentations.create({
    requestBody: {
      title: 'My Presentation'
    }
  });

  const presentationId = presentation.data.presentationId;
  console.log(`Created presentation with ID: ${presentationId}`);

  // Add slides with text to the presentation
  for (let i = 0; i < summaryPoints.length; i++) {
    const slide = await slides.presentations.pages.batchUpdate({
      presentationId,
      requestBody: {
        requests: [{
          createSlide: {}
        }]
      }
    });
    const slideId = slide.data.replies[0].createSlide.objectId;
    console.log(`Created slide with ID: ${slideId}`);

    await slides.presentations.pages.batchUpdate({
      presentationId,
      pageObjectId: slideId,
      requestBody: {
        requests: [{
          createShape: {
            shapeType: 'TEXT_BOX',
            elementProperties: {
              pageObjectId: slideId,
              size: {
                height: {
                  magnitude: 100,
                  unit: 'PT'
                },
                width: {
                  magnitude: 400,
                  unit: 'PT'
                }
              },
              transform: {
                scaleX: 1,
                scaleY: 1,
                translateX: 20 + (i * 50),
                translateY: 100
              }
            }
          }
        }]
      }
    });

    await slides.presentations.batchUpdate({
      presentationId,
      requestBody: {
        requests: [{
          insertText: {
            objectId: slideId,
            text: summaryPoints[i],
            insertionIndex: 0
          }
        }]
      }
    });
  }
};

export default createPresentation;
