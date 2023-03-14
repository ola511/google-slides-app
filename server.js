const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const process = require('process');
//set up a new openai api configuration
const { Configuration, OpenAIApi } = require("openai");

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})

const openai = new OpenAIApi(config);

//Google Slides authorization
const fs = require('fs').promises;
const path = require('path');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');
const { response } = require("express");
const { OAuth2Client } = require("google-auth-library");

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

let points = [];
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

    const pointsRough = response.data.choices[0].text.split(':::');
    points = pointsRough.slice(1);

    res.json({
      data: points,
    })
  }
  catch (error) {
    return res.status(400).json({
      success: false,
      error: error.response ? error.response.data : "There was an issue on the server",
    })
  }

});

//post request for creating a presentation
app.post("/create-presentation", async (req, res) => {

  
  try {
    const { title } = req.body;

    const client = await authorize();
    const presentation = await createPresentation(client, title);

    if (points.length%3 !== 0){
      const remainder = 3 - points.length%3;
      for (let q = 0;q < remainder; q++){
        points.push("");
      }
    }

    let numSlides = ~~(points.length/3); //gets the amount of slides based on points generated for 3 points in a slide
    let titlePageIndex = "p"

    for (let i = 0; i < numSlides; i++){
    await createSlide(client, presentation.data.presentationId, i);
    }
    //await updateTitleText(client, presentation.data.presentationId, titlePageIndex, title);
    for (let i = 0; i < numSlides; i++){
      await createTextboxWithText(client, presentation.data.presentationId, i, points[i*3], points[i*3+1], points[i*3+2]);
    }

    res.json({
      data: presentation.data,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({
      success: false,
      error: error.response ? error.response.data : "There was an issue on the server",
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

//update title in the titlepage textbox
async function updateTitleText(client, presentationId, titlePageIndex, title) {
  const { google } = require("googleapis");
  const slides = google.slides({ version: "v1", auth: client });


  try {
    const res = await slides.presentations.get({
      presentationId: presentationId,
    });
    const titlePageObjectId = res.data.titlePageIndex.objectId; // assumes title page is the first slide
    const requests = [{
      insertText: {
        objectId: titlePageObjectId,
        text: title,
      },
    }];
    await slides.presentations.batchUpdate({
      presentationId: presentationId,
      requestBody: {
        requests: requests,
      },
    });
    console.log('Title added to title page.');
  } catch (err) {
    console.error('Error adding text to title page:', err);
  }

}

//server listening on port 5000
const port = 5000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
