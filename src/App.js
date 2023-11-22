
import React, { useState , useEffect } from "react";
import FileUpload from "./FileUpload";
import { Button, Input, Textarea, Center, Text, Heading, useToast, Link, Container } from '@chakra-ui/react'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

//import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';
//import * as pdfjs from 'pdfjs-dist';
//import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';
//import { Document, Page, pdfjs } from 'react-pdf/dist/umd/react-pdf';
//import { Document, Page } from 'react-pdf/dist/umd/react-pdf''react-pdf/dist/esm/entry.webpack';

//pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js`;

//import * as pdfjsLib from "pdfjs-dist";

//pdfjsLib.GlobalWorkerOptions.workerSrc = null;



function App() {
  const [script, setScript] = useState("");
  const [input, setInput] = useState("");
  const [title, setTitle] = useState("");
  const [presId, setPresId] = useState("");
  const [text, setText] = useState("");

  let url = "https://docs.google.com/presentation/d/" + presId + "/edit#slide=id.p";

  const toast = useToast();


  
  const handleGoogleLoginSuccess = (response) => {
    console.log("Google login successful", response);
  
    // Retrieve the authentication token
    const token = response.credential;
  
    // Optionally, fetch user profile or do something with the token
    // ...
  
    // Update application state to indicate user is logged in
    // ...
  
    // Optionally, redirect user or display a success message
    // ...
  };

  
  const handleGoogleLoginError = (error) => {
    console.error("Google login failed", error);
  
    // Display an error message to the user
    // ...
  
    // Reset login-related state or UI elements if necessary
    // ...
  };
  

  const handleFileUploaded = (file) => {
    const reader = new FileReader();
  
    reader.onload = (event) => {
      const textContent = event.target.result;
      console.log('File content:', textContent);  // Add this line for debugging
      setText(textContent);
       // Call processFile here
    processFile(textContent);
    };
  
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
    };
  
    reader.readAsText(file);
  };
  
  async function processFile(fileContent) {
    // Set the script state to the content of the file
    setScript(fileContent);
  
    // Summarize the text
    const response = await fetch("http://localhost:5000/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: fileContent
      })
    });
    const aiResponse = await response.json();
    let pointsArray = aiResponse.data.text.split(':::').slice(1);
    if (pointsArray.length % 3 !== 0){
      const remainder = 3 - pointsArray.length % 3;
      for (let q = 0; q < remainder; q++){
        pointsArray.push("");
      }
    }
  
    // Create the presentation
    handleCreate(title, pointsArray);
  }
  


  const handleChange = (event) => {
    setInput(event.target.value);
    setScript(event.target.value);
  }

  const handleChangeTitle = (event) => {
    setTitle(event.target.value);
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    setScript(text);
    setScript(event.target.value);
    setInput("");
    setTitle("");
    handleSummarize();
  };

  const handlePaste = (event) => {
    const pastedText = event.clipboardData.getData("text");
    const newValue = input.substring(0, event.target.selectionStart) + pastedText + input.substring(event.target.selectionEnd);
    setInput(newValue);
    setScript(newValue);
  }

  async function handleSummarize() {
    //makes http request to server on exposed endpoint
    const response = await fetch("http://localhost:5000/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: script
      })
    });
    const aiResponse = await response.json();
    //split the json reponse by dashes into an array 
    console.log(aiResponse);
    let pointsArray = aiResponse.data.text.split(':::').slice(1);
    if (pointsArray.length % 3 !== 0){
      const remainder = 3 - pointsArray.length % 3;
      for (let q = 0; q < remainder; q++){
        pointsArray.push("");
      }
    }

    setScript("");
    handleCreate(title, pointsArray);
  }

  async function handleCreate(title, summaryPoints) {
    //makes http request to create presentation
    console.log(title, summaryPoints);
    try {
      const response = await fetch('http://localhost:5000/create-presentation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, summaryPoints }),
      });
      const presentation = await response.json();
      setPresId(presentation.data.presentationId);

      return presentation;
    } catch (error) {
      console.error(error);
    }
  }
 
 
  return (
    <GoogleOAuthProvider clientId="672630390582-nfevm3j0aeoa09i2o0u4s25o9qs8b542.apps.googleusercontent.com">
      <div>
        <Center bg='black' h='100px' color='white'><Text fontSize='5xl'>Google Slides Automator</Text></Center><br />

        {/* Google Login Button */}
        <Center>
          <GoogleLogin
            onSuccess={handleGoogleLoginSuccess}
            onError={handleGoogleLoginError}
          />
        </Center>
        <br />

        <Center>
          <FileUpload onFileUploaded={handleFileUploaded} />
        </Center>
        <br />
        <Center><Heading>OR</Heading></Center><br />
        <Center>
          <Heading>Paste the script below</Heading><br />
        </Center>
        <form onSubmit={handleSubmit}>
          <strong>Title: </strong>
          <Input
            type="text"
            placeholder="Enter Title"
            onChange={handleChangeTitle}
            value={title}>
          </Input><br /><br/>
          <strong>Script: </strong>
          <Textarea
            type="text"
            placeholder="Enter Script"
            cols={80}
            rows={10}
            onChange={handleChange}
            onPaste={handlePaste}
            value={input} /><br />
          <Button type="submit" disabled={input === ""} >Submit</Button>
        </form>
        <Center>
        {presId !== ""
          ? toast({
              title: "Hooray!!!",
              description: (
                <>
                  Presentation has been created!
                  <br /> <Link href={url} isExternal>
                    Click here to view
                  </Link>
                </>
              ),
              status: "success",
              duration: 6000,
              isClosable: true,
            }) && setPresId("")
          : null}
        </Center>
      </div>
    </GoogleOAuthProvider>
  );
}
export default App;
































 