import React, { useState } from "react";
import FileUpload from "./FileUpload";
//import GoogleSlidesPres from "./GoogleSlidesPres";

function App() {
  const [script, setScript] = useState("");
  const [summaryPoints, setSummaryPoints] = useState([]);
  //const [fileContents, setFileContents] = useState("");
  const [input, setInput] = useState("");

  //only works for txt files
  const handleFileUploaded = (file) => {
    const reader = new FileReader();

    reader.onload = () => {
        const contents = reader.result;
        setScript(contents);
    }

    reader.readAsText(file);

  };

  const handleChange = (event) => {
    setInput(event.target.value);
    setScript(input);
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    setScript(input);
    setInput("");
    handleSummarize();

  };

  const handlePaste = (event) => {
    const pastedText = event.clipboardData.getData("text");
    const newValue = input.substring(0, event.target.selectionStart) + pastedText + input.substring(event.target.selectionEnd);
    setInput(newValue);
    setScript(newValue);
  }

  async function handleSummarize () {
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
    const data = await response.json();
    console.log(data);
    //split the json reponse by dashes into an array 
    const pointsArray = data.data.split("~");
    setSummaryPoints(pointsArray);
    setScript("");
  }

  

  return (
    <div>
      <h1>Google Slides Automator</h1>
      <FileUpload onFileUploaded={handleFileUploaded} />
      {/*<GoogleSlidesPres />  */}
      <br/>
      <strong>OR</strong>
      <p>Paste the script here</p>
      <form onSubmit={handleSubmit}>
      <textarea 
      type="text"
      placeholder="Enter Script"
      cols={80}
      rows={10}
      onChange={handleChange} 
      onPaste={handlePaste}
      value={input}/><br />
      {input !== "" ? (<button type="submit">Submit</button>) : null}
      </form>
      <ul>
        {summaryPoints.map((point, index) => (
          <li key={index}>{point}</li>
        ))}
      </ul>
    </div>
    
  );
}

export default App;