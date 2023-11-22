import React from "react";
import { Center, Heading } from '@chakra-ui/react'




const FileUpload = ({ onFileUploaded }) => {
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      onFileUploaded(file);
    }
  };

  return (
    <div>
    <Center> <Heading>Upload a file with your script</Heading></Center><br />
     <Heading as="h4" color="red.400" mt={2} mb={4}>
    Important: Add the title of your presentation before uploading the file.
  </Heading>
      <input type="file" accept=".txt" onChange={handleFileChange} />
    </div>
  );
};


/*function FileUpload({ onFileUploaded }) {
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
}*/

export default FileUpload;