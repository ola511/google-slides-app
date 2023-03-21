import React from "react";
import { Heading } from '@chakra-ui/react'

function FileUpload({ onFileUploaded }) {
  function handleFileChange(event) {
    const file = event.target.files[0];

    if (!file){
        return;
    }

    onFileUploaded(file);
  }

  return (
    <div>
      <Heading>Upload a file with your script</Heading><br />
      <input type="file" onChange={handleFileChange} />
    </div>
  );
}

export default FileUpload;