const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const process = require('process');
//set up a new openai api configuration
const { Configuration, OpenAIApi } = require("openai");

const config = new Configuration({
  apiKey:"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"

})

const openai = new OpenAIApi(config);

//Google Slides authorization
const fs = require('fs').promises;
const path = require('path');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');
const { response } = require("express");
// OAuth 2.0 Client Setup
const { OAuth2Client } = require('google-auth-library');
//import { GoogleOAuthProvider } from "@react-oauth/google";
/*const CLIENT_ID = '672630390582-nfevm3j0aeoa09i2o0u4s25o9qs8b542.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:5000'; // e.g., http://localhost:5000/oauth2callback*/
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const apiKey = process.env.OPENAI_API_KEY;
const REDIRECT_URI = 'http://localhost:5000/oauth2callback'; // or whatever your redirect URI is
const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/presentations'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

//Set up Server
const app = express();
app.use(bodyParser.json());
app.use(cors());




app.get('/your-endpoint', (req, res) => {
  res.json({ message: 'This endpoint is CORS-enabled for all origins!' });
});

// Implement Login Endpoint
app.get('/login', (req, res) => {
  try {
      const url = oAuth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: ['https://www.googleapis.com/auth/presentations'],
      });
      res.redirect(url);
  } catch (error) {
      console.error('Error during login:', error);
      res.status(500).send('Error during login');
  }
});

// Implement OAuth Callback Endpoint
app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  if (code) {
    try {
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);
      await saveCredentials(oAuth2Client); // Save tokens for later use
      res.redirect('/'); // Redirect to your application's main page
    } catch (error) {
      console.error('Error getting OAuth tokens:', error);
      res.status(500).send('Authentication failed');
    }
  } else {
    res.status(400).send('Invalid request');
  }
});

// Modify Existing Functions
/*async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    oAuth2Client.setCredentials(client);
    return oAuth2Client;
  }
  throw new Error('No saved credentials');
}*/

//Set up Endpoint for ChatGPT
app.post("/summarize", async (req, res) => {

  try {
    const { prompt } = req.body;

    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: `Summarize the following text into important points for a presentation, separate each point with a ':::' instead of numbers: ${prompt}`,
      max_tokens: 1000,
      temperature: 0.5,
    });

    const aiResponse = response.data.choices[0];

    res.json({
      data: aiResponse,
    })
  }
  catch (error) {
    return res.status(400).json({
      success: false,
      error: error.response ? error.response.data : "There was an issue on the server",
    })
  }

});

app.post("/create-presentation", async (req, res) => {
  try {
    const { title, summaryPoints: points } = req.body;

    const client = await authorize();
    const presentation = await createPresentation(client, title);

    // Create your own custom title slide at index 0
    const customTitleSlide = await createSlide(
      client,
      presentation.data.presentationId,
      0
    );
    await createTitleTextbox(
      client,
      presentation.data.presentationId,
      0,
      title
    );

    let numSlides = ~~(points.length / 3);

    for (let i = 1; i <= numSlides; i++) {
      await createSlide(client, presentation.data.presentationId, i);
    }

    for (let i = 1; i <= numSlides; i++) {
      await createTextboxWithText(
        client,
        presentation.data.presentationId,
        i,
        points[(i - 1) * 3],
        points[(i - 1) * 3 + 1],
        points[(i - 1) * 3 + 2]
      );
    }

    // Delete the auto-generated title slide
    const titleSlideId = "p"; // Replace with the actual ID of the title slide
    await deleteSlide(client, presentation.data.presentationId, titleSlideId);

    res.json({
      data: presentation.data,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({
      success: false,
      error: error.response
        ? error.response.data
        : "There was an issue on the server",
    });
  }
});




/**
* Reads previously authorized credentials from the save file.
*
* @return {Promise<OAuth2Client|null>}
*/
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
} 

async function deleteSlide(client, presentationId, slideIndex) {
  const { google } = require("googleapis");

  const slides = google.slides({ version: "v1", auth: client });
  const objectId = `${slideIndex}`;
  const requests = [
    {
      deleteObject: {
        objectId,
      },
    },
  ];

  // Execute the request.
  try {
    const res = await slides.presentations.batchUpdate({
      presentationId,
      resource: {
        requests,
      },
    });
    console.log(`Deleted slide at index: ${slideIndex}`);
    return res;
  } catch (err) {
    // TODO (developer) - handle exception
    throw err;
  }
}

//function that creates a Google Slides presentation
async function createPresentation(client, title) {
  const { google } = require("googleapis");
  const slides = google.slides({ version: "v1", auth: client });

  const presentation = await slides.presentations.create({
    title: title,
  });

  console.log(`Created presentation with ID: ${presentation.data.presentationId}`);

  return presentation;
}

//function that creates a slide
async function createSlide(client, presentationId, slideIndex) {
  const {google} = require('googleapis');

  const slides = google.slides({version: 'v1', auth: client});
  const objectId = `Slide_${slideIndex}`;
  const requests = [
    {
      createSlide: {
        objectId,
        insertionIndex: slideIndex+1,
      },
    },
  
  ];

  // Execute the request.
  try {
    const res = await slides.presentations.batchUpdate({
      presentationId,
      resource: {
        requests,
      },
    });
    console.log(
        `Created slide with ID: ${res.data.replies[0].createSlide.objectId}`,
    );
    return res;
  } catch (err) {
    // TODO (developer) - handle exception
    throw err;
  }
}

//create a textbox in the slide and add point data
async function createTextboxWithText(client, presentationId, slideIndex, point1, point2, point3) {
  const {google} = require('googleapis');

  const slides = google.slides({version: 'v1', auth: client});
  const pageObjectId = `Slide_${slideIndex}`;
  const elementId = `MyTextBox_${slideIndex}`;
  const pt400 = {
    magnitude: 400,
    unit: 'PT',
  };
  const pt250 = {
    magnitude: 250,
    unit: 'PT',
  };

  const requests = [
    {
      createShape: {
        objectId: elementId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId,
          size: {
            height: pt250,
            width: pt400,
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: 70,
            translateY: 100,
            unit: 'PT',
          },
        },
      },
    },
    // Insert text into the box, using the supplied element ID.
    {
      insertText: {
        objectId: elementId,
        insertionIndex: 0,
        text: point1 + "\n\n\n" + point2 + "\n\n\n" + point3,
      },
    },
  ];
  // Execute the request.
  try {
    const createTextboxWithTextResponse =
      await slides.presentations.batchUpdate({
        presentationId,
        resource: {requests},
      });
    const createShapeResponse =
      createTextboxWithTextResponse.data.replies[0].createShape;
    console.log(`Created textbox with ID: ${createShapeResponse.objectId}`);
    return createTextboxWithTextResponse.data;
  } catch (err) {
    // TODO (developer) - Handle exception
    throw err;
  }
}

//create a textbox for title
async function createTitleTextbox(client, presentationId, slideIndex, title) {
  const { google } = require("googleapis");

  const slides = google.slides({ version: "v1", auth: client });
  const pageObjectId = `Slide_${slideIndex}`;
  const elementId = `MyTextBox_${slideIndex}`;
  const pt400 = {
    magnitude: 400,
    unit: "PT",
  };
  const pt250 = {
    magnitude: 250,
    unit: "PT",
  };
  const pt64 = {
    magnitude: 64, // Adjust the font size as needed
    unit: "PT",
  };

  const requests = [
    {
      createShape: {
        objectId: elementId,
        shapeType: "TEXT_BOX",
        elementProperties: {
          pageObjectId,
          size: {
            height: pt250,
            width: pt400,
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: 70,
            translateY: 100,
            unit: "PT",
          },
        },
      },
    },
    // Insert an initial space character to ensure the text box is not empty.
    {
      insertText: {
        objectId: elementId,
        insertionIndex: 0,
        text: " ",
      },
    },
    // Set the font size for the title.
    {
      updateTextStyle: {
        objectId: elementId,
        textRange: {
          type: "ALL",
        },
        fields: "fontSize",
        style: {
          fontSize: pt64, // Font size
        },
      },
    },
    // Update the text content with the actual title.
    {
      deleteText: {
        objectId: elementId,
        textRange: {
          type: "ALL",
        },
      },
    },
    {
      insertText: {
        objectId: elementId,
        insertionIndex: 0,
        text: title,
      },
    },
  ];

  // Execute the request.
  try {
    const createTitleTextboxResponse = await slides.presentations.batchUpdate({
      presentationId,
      resource: { requests },
    });
    const createShapeResponse =
      createTitleTextboxResponse.data.replies[0].createShape;
    console.log(
      `Created title textbox with ID: ${createShapeResponse.objectId}`
    );
    return createTitleTextboxResponse.data;
  } catch (err) {
    // TODO (developer) - Handle exception
    throw err;
  }
}


//server listening on port 5000
const port = 5000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});


