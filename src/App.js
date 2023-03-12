import React, { useState } from "react";
import FileUpload from "./FileUpload";
//import GoogleSlidesPres from "./GoogleSlidesPres";

function App() {
  const [script, setScript] = useState("");
  const [summaryPoints, setSummaryPoints] = useState([]);
  //const [fileContents, setFileContents] = useState("");
  const [input, setInput] = useState("");
  const [title, setTitle] = useState("");

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
    setScript(event.target.value);
  }

  const handleChangeTitle= (event) => {
    setTitle(event.target.value);
  }

  const handleSubmit = (event) => {
    event.preventDefault();
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
    const data = await response.json();
    //split the json reponse by dashes into an array 
    const pointsArray = data.data;
    setSummaryPoints(pointsArray);
    setScript("");
    handleCreate(title);
  }

  async function handleCreate(title){
    //makes http request to create presentation
    try {
      const response = await fetch('http://localhost:5000/create-presentation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(error);
    }
  }



  return (
    <div>
      <h1>Google Slides Automator</h1>
      <FileUpload onFileUploaded={handleFileUploaded} />
      {/*<GoogleSlidesPres />  */}
      <br />
      <strong>OR</strong>
      <p>Paste the script below</p>
      <form onSubmit={handleSubmit}>
        <strong>Title: </strong>
        <input
        type="text"
        placeholder="Enter Title"
        onChange={handleChangeTitle}
        value={title}>
        </input><br /><br/>
        <strong>Script: </strong>
        <textarea
          type="text"
          placeholder="Enter Script"
          cols={80}
          rows={10}
          onChange={handleChange}
          onPaste={handlePaste}
          value={input} /><br />
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